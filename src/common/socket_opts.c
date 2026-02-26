/**
 * @file socket_opts.c
 * @brief Network socket optimizations for high-performance I/O
 * 
 * Implements optimizations from original Mirai for scale:
 * - Connection keep-alive
 * - TCP fast open
 * - SO_REUSEADDR/SO_REUSEPORT
 * - Larger send/recv buffers
 * - Disable Nagle's algorithm (TCP_NODELAY)
 * 
 * Target: 100k+ concurrent connections with 2% CPU usage
 * 
 * @author Mirai 2026 Research Team
 * @date 2026-02-25
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <fcntl.h>

#include "socket_opts.h"
#include "logger.h"

/**
 * Set socket to non-blocking mode
 */
int socket_set_nonblocking(int sockfd) {
    int flags = fcntl(sockfd, F_GETFL, 0);
    if (flags == -1) {
        log_error("fcntl F_GETFL failed: %s", strerror(errno));
        return -1;
    }
    
    if (fcntl(sockfd, F_SETFL, flags | O_NONBLOCK) == -1) {
        log_error("fcntl F_SETFL failed: %s", strerror(errno));
        return -1;
    }
    
    return 0;
}

/**
 * Enable SO_REUSEADDR - allows rapid restart of server
 */
int socket_set_reuseaddr(int sockfd) {
    int opt = 1;
    if (setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        log_error("SO_REUSEADDR failed: %s", strerror(errno));
        return -1;
    }
    return 0;
}

/**
 * Enable SO_REUSEPORT - allows multiple sockets to bind to same port
 * Useful for multi-threaded servers
 */
int socket_set_reuseport(int sockfd) {
#ifdef SO_REUSEPORT
    int opt = 1;
    if (setsockopt(sockfd, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt)) < 0) {
        log_error("SO_REUSEPORT failed: %s", strerror(errno));
        return -1;
    }
    return 0;
#else
    log_warn("SO_REUSEPORT not supported on this system");
    return -1;
#endif
}

/**
 * Enable TCP keep-alive
 * Detects dead connections and reclaims resources
 */
int socket_set_keepalive(int sockfd, int idle_sec __attribute__((unused)), int interval_sec, int count) {
    int opt = 1;
    if (setsockopt(sockfd, SOL_SOCKET, SO_KEEPALIVE, &opt, sizeof(opt)) < 0) {
        log_error("SO_KEEPALIVE failed: %s", strerror(errno));
        return -1;
    }
    
#ifdef TCP_KEEPIDLE
    if (setsockopt(sockfd, IPPROTO_TCP, TCP_KEEPIDLE, &idle_sec, sizeof(idle_sec)) < 0) {
        log_error("TCP_KEEPIDLE failed: %s", strerror(errno));
        return -1;
    }
#endif
    
#ifdef TCP_KEEPINTVL
    if (setsockopt(sockfd, IPPROTO_TCP, TCP_KEEPINTVL, &interval_sec, sizeof(interval_sec)) < 0) {
        log_error("TCP_KEEPINTVL failed: %s", strerror(errno));
        return -1;
    }
#endif
    
#ifdef TCP_KEEPCNT
    if (setsockopt(sockfd, IPPROTO_TCP, TCP_KEEPCNT, &count, sizeof(count)) < 0) {
        log_error("TCP_KEEPCNT failed: %s", strerror(errno));
        return -1;
    }
#endif
    
    return 0;
}

/**
 * Disable Nagle's algorithm (TCP_NODELAY)
 * Reduces latency for small packets (critical for C&C)
 */
int socket_set_nodelay(int sockfd) {
    int opt = 1;
    if (setsockopt(sockfd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt)) < 0) {
        log_error("TCP_NODELAY failed: %s", strerror(errno));
        return -1;
    }
    return 0;
}

/**
 * Enable TCP Fast Open
 * Reduces connection establishment latency
 */
int socket_set_fastopen(int sockfd, int queue_len) {
#ifdef TCP_FASTOPEN
    if (setsockopt(sockfd, IPPROTO_TCP, TCP_FASTOPEN, &queue_len, sizeof(queue_len)) < 0) {
        log_error("TCP_FASTOPEN failed: %s", strerror(errno));
        return -1;
    }
    return 0;
#else
    log_warn("TCP_FASTOPEN not supported on this system");
    return -1;
#endif
}

/**
 * Set larger send buffer
 * Improves throughput for high-volume data
 */
int socket_set_sendbuf(int sockfd, int size) {
    if (setsockopt(sockfd, SOL_SOCKET, SO_SNDBUF, &size, sizeof(size)) < 0) {
        log_error("SO_SNDBUF failed: %s", strerror(errno));
        return -1;
    }
    return 0;
}

/**
 * Set larger receive buffer
 * Prevents packet loss under high load
 */
int socket_set_recvbuf(int sockfd, int size) {
    if (setsockopt(sockfd, SOL_SOCKET, SO_RCVBUF, &size, sizeof(size)) < 0) {
        log_error("SO_RCVBUF failed: %s", strerror(errno));
        return -1;
    }
    return 0;
}

/**
 * Set send/receive timeout
 */
int socket_set_timeout(int sockfd, int send_timeout_sec, int recv_timeout_sec) {
    struct timeval send_tv = {send_timeout_sec, 0};
    struct timeval recv_tv = {recv_timeout_sec, 0};
    
    if (setsockopt(sockfd, SOL_SOCKET, SO_SNDTIMEO, &send_tv, sizeof(send_tv)) < 0) {
        log_error("SO_SNDTIMEO failed: %s", strerror(errno));
        return -1;
    }
    
    if (setsockopt(sockfd, SOL_SOCKET, SO_RCVTIMEO, &recv_tv, sizeof(recv_tv)) < 0) {
        log_error("SO_RCVTIMEO failed: %s", strerror(errno));
        return -1;
    }
    
    return 0;
}

/**
 * Apply all optimizations for high-performance server socket
 * 
 * Optimizations:
 * - Non-blocking I/O
 * - SO_REUSEADDR + SO_REUSEPORT
 * - TCP_NODELAY (disable Nagle)
 * - Keep-alive (60s idle, 10s interval, 3 probes)
 * - Large buffers (256KB send/recv)
 * - TCP Fast Open (queue 1024)
 */
int socket_optimize_server(int sockfd) {
    int errors = 0;
    
    // Non-blocking
    if (socket_set_nonblocking(sockfd) < 0) {
        errors++;
    }
    
    // Reuse address and port
    if (socket_set_reuseaddr(sockfd) < 0) {
        errors++;
    }
    socket_set_reuseport(sockfd);  // Optional, may not be supported
    
    // TCP optimizations
    if (socket_set_nodelay(sockfd) < 0) {
        errors++;
    }
    
    // Keep-alive (60s idle, 10s interval, 3 retries)
    if (socket_set_keepalive(sockfd, 60, 10, 3) < 0) {
        errors++;
    }
    
    // Large buffers (256KB each)
    if (socket_set_sendbuf(sockfd, 262144) < 0) {
        errors++;
    }
    if (socket_set_recvbuf(sockfd, 262144) < 0) {
        errors++;
    }
    
    // TCP Fast Open (optional)
    socket_set_fastopen(sockfd, 1024);  // May fail on some systems
    
    if (errors > 0) {
        log_warn("Socket optimization completed with %d errors", errors);
    } else {
        log_debug("Socket fully optimized for high-performance server");
    }
    
    return errors > 0 ? -1 : 0;
}

/**
 * Apply optimizations for high-performance client socket
 * 
 * Optimizations:
 * - Non-blocking I/O
 * - TCP_NODELAY (disable Nagle)
 * - Large buffers (128KB send/recv)
 * - Timeouts (5s send, 5s recv)
 */
int socket_optimize_client(int sockfd) {
    int errors = 0;
    
    // Non-blocking
    if (socket_set_nonblocking(sockfd) < 0) {
        errors++;
    }
    
    // TCP optimizations
    if (socket_set_nodelay(sockfd) < 0) {
        errors++;
    }
    
    // Moderate buffers (128KB each)
    if (socket_set_sendbuf(sockfd, 131072) < 0) {
        errors++;
    }
    if (socket_set_recvbuf(sockfd, 131072) < 0) {
        errors++;
    }
    
    // Timeouts (5 seconds)
    if (socket_set_timeout(sockfd, 5, 5) < 0) {
        errors++;
    }
    
    if (errors > 0) {
        log_warn("Client socket optimization completed with %d errors", errors);
    } else {
        log_debug("Client socket fully optimized");
    }
    
    return errors > 0 ? -1 : 0;
}

/**
 * Apply optimizations for scanner socket
 * 
 * Optimizations:
 * - Non-blocking I/O
 * - TCP_NODELAY
 * - Small buffers (16KB send/recv) - we don't need much for scanning
 * - Short timeouts (2s send, 2s recv)
 */
int socket_optimize_scanner(int sockfd) {
    int errors = 0;
    
    // Non-blocking
    if (socket_set_nonblocking(sockfd) < 0) {
        errors++;
    }
    
    // TCP optimizations
    if (socket_set_nodelay(sockfd) < 0) {
        errors++;
    }
    
    // Small buffers (16KB each) - scanner doesn't transfer much data
    if (socket_set_sendbuf(sockfd, 16384) < 0) {
        errors++;
    }
    if (socket_set_recvbuf(sockfd, 16384) < 0) {
        errors++;
    }
    
    // Short timeouts (2 seconds)
    if (socket_set_timeout(sockfd, 2, 2) < 0) {
        errors++;
    }
    
    if (errors > 0) {
        log_warn("Scanner socket optimization completed with %d errors", errors);
    } else {
        log_debug("Scanner socket fully optimized");
    }
    
    return errors > 0 ? -1 : 0;
}

/**
 * Get current socket buffer sizes
 */
int socket_get_buffer_sizes(int sockfd, int *sendbuf, int *recvbuf) {
    socklen_t len = sizeof(int);
    
    if (getsockopt(sockfd, SOL_SOCKET, SO_SNDBUF, sendbuf, &len) < 0) {
        log_error("Failed to get SO_SNDBUF: %s", strerror(errno));
        return -1;
    }
    
    if (getsockopt(sockfd, SOL_SOCKET, SO_RCVBUF, recvbuf, &len) < 0) {
        log_error("Failed to get SO_RCVBUF: %s", strerror(errno));
        return -1;
    }
    
    return 0;
}

/**
 * Print socket options for debugging
 */
void socket_print_opts(int sockfd) {
    int sendbuf, recvbuf;
    int nodelay, keepalive, reuseaddr;
    socklen_t len = sizeof(int);
    
    socket_get_buffer_sizes(sockfd, &sendbuf, &recvbuf);
    
    getsockopt(sockfd, IPPROTO_TCP, TCP_NODELAY, &nodelay, &len);
    getsockopt(sockfd, SOL_SOCKET, SO_KEEPALIVE, &keepalive, &len);
    getsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &reuseaddr, &len);
    
    log_info("Socket options for fd=%d:", sockfd);
    log_info("  Send buffer: %d bytes", sendbuf);
    log_info("  Recv buffer: %d bytes", recvbuf);
    log_info("  TCP_NODELAY: %s", nodelay ? "enabled" : "disabled");
    log_info("  SO_KEEPALIVE: %s", keepalive ? "enabled" : "disabled");
    log_info("  SO_REUSEADDR: %s", reuseaddr ? "enabled" : "disabled");
}

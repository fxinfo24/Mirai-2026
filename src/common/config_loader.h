#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

// Result type for error handling
typedef struct {
    bool success;
    const char *error_msg;
    int error_code;
} result_t;

#define RESULT_OK                                                                                  \
    (result_t) { .success = true, .error_msg = NULL, .error_code = 0 }
#define RESULT_ERROR(msg, code)                                                                    \
    (result_t) { .success = false, .error_msg = msg, .error_code = code }

// Configuration structures

// Network configuration
typedef struct {
    char *cnc_domain;
    uint16_t cnc_port;
    char *scan_callback_domain;
    uint16_t scan_callback_port;
    bool use_encryption;
    char *encryption_key;
} network_config_t;

// Credential entry
typedef struct {
    char *username;
    char *password;
    uint16_t weight;
} credential_t;

// Credentials configuration
typedef struct {
    credential_t *credentials;
    size_t credential_count;
    bool ai_generation_enabled;
    char *ai_model_path;
    char *breach_database_path;
} credentials_config_t;

// Scanner configuration
typedef struct {
    uint32_t max_connections;
    uint32_t scan_rate_pps;
    uint32_t timeout_seconds;
    bool randomize_scan_order;
    char **excluded_networks;
    size_t excluded_network_count;
} scanner_config_t;

// Research safeguards
typedef struct {
    bool enabled;
    char **allowed_networks;
    size_t allowed_network_count;
    uint64_t max_runtime_seconds;
    bool require_authorization;
    char *kill_switch_url;
} safeguards_config_t;

// Main configuration
typedef struct {
    network_config_t network;
    credentials_config_t credentials;
    scanner_config_t scanner;
    safeguards_config_t safeguards;
    char *component_name;
} mirai_config_t;

// Load configuration from JSON file
result_t config_load(const char *filepath, mirai_config_t *config);

// Free configuration memory
void config_free(mirai_config_t *config);

// Validate configuration
result_t config_validate(const mirai_config_t *config);

// Get configuration value by path (e.g., "network.cnc_domain")
result_t config_get_string(const mirai_config_t *config, const char *path, char **value);
result_t config_get_int(const mirai_config_t *config, const char *path, int64_t *value);
result_t config_get_bool(const mirai_config_t *config, const char *path, bool *value);

// Save configuration to JSON file
result_t config_save(const char *filepath, const mirai_config_t *config);

#define _GNU_SOURCE
/**
 * Authorization Framework Implementation - Mirai 2026
 */

#include "authorization.h"
#include "logger.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <json-c/json.h>
#include <arpa/inet.h>

/**
 * Parse CIDR notation (e.g., "192.168.1.0/24")
 */
static bool ip_in_cidr(const char *ip, const char *cidr) {
    char cidr_copy[64];
    strncpy(cidr_copy, cidr, sizeof(cidr_copy) - 1);
    
    char *slash = strchr(cidr_copy, '/');
    if (!slash) {
        // No subnet mask, exact match
        return strcmp(ip, cidr) == 0;
    }
    
    *slash = '\0';
    int prefix_len = atoi(slash + 1);
    
    struct in_addr ip_addr, network_addr;
    if (inet_pton(AF_INET, ip, &ip_addr) != 1) {
        return false;
    }
    if (inet_pton(AF_INET, cidr_copy, &network_addr) != 1) {
        return false;
    }
    
    uint32_t mask = prefix_len == 0 ? 0 : htonl(~((1 << (32 - prefix_len)) - 1));
    
    return (ip_addr.s_addr & mask) == (network_addr.s_addr & mask);
}

auth_config_t *auth_init(const char *config_file) {
    if (!config_file) {
        log_error("No authorization config file specified");
        return NULL;
    }

    auth_config_t *auth = calloc(1, sizeof(auth_config_t));
    if (!auth) {
        log_error("Failed to allocate authorization config");
        return NULL;
    }

    // Parse JSON config
    json_object *root = json_object_from_file(config_file);
    if (!root) {
        log_error("Failed to parse authorization file: %s", config_file);
        free(auth);
        return NULL;
    }

    // Extract token
    json_object *token_obj;
    if (json_object_object_get_ex(root, "token", &token_obj)) {
        const char *token = json_object_get_string(token_obj);
        strncpy(auth->token, token, TOKEN_LENGTH);
    } else {
        log_error("Missing token in authorization file");
        json_object_put(root);
        free(auth);
        return NULL;
    }

    // Extract timestamps
    json_object *issued_obj, *expires_obj;
    if (json_object_object_get_ex(root, "issued_at", &issued_obj)) {
        const char *issued = json_object_get_string(issued_obj);
        // Parse ISO8601 timestamp (simplified)
        struct tm tm;
        strptime(issued, "%Y-%m-%dT%H:%M:%S", &tm);
        auth->issued_at = mktime(&tm);
    }
    
    if (json_object_object_get_ex(root, "expires_at", &expires_obj)) {
        const char *expires = json_object_get_string(expires_obj);
        struct tm tm;
        strptime(expires, "%Y-%m-%dT%H:%M:%S", &tm);
        auth->expires_at = mktime(&tm);
    }

    // Extract researcher and project IDs
    json_object *researcher_obj, *project_obj;
    if (json_object_object_get_ex(root, "researcher_id", &researcher_obj)) {
        strncpy(auth->researcher_id, json_object_get_string(researcher_obj), 255);
    }
    if (json_object_object_get_ex(root, "project_id", &project_obj)) {
        strncpy(auth->project_id, json_object_get_string(project_obj), 255);
    }

    // Extract authorized operations
    json_object *ops_obj;
    if (json_object_object_get_ex(root, "authorized_operations", &ops_obj)) {
        int ops_len = json_object_array_length(ops_obj);
        auth->num_operations = ops_len < MAX_AUTHORIZED_OPS ? ops_len : MAX_AUTHORIZED_OPS;
        
        for (int i = 0; i < auth->num_operations; i++) {
            json_object *op = json_object_array_get_idx(ops_obj, i);
            auth->authorized_operations[i] = strdup(json_object_get_string(op));
        }
    }

    // Extract network restrictions
    json_object *networks_obj;
    if (json_object_object_get_ex(root, "network_restrictions", &networks_obj)) {
        int net_len = json_object_array_length(networks_obj);
        auth->num_networks = net_len < MAX_NETWORK_RANGES ? net_len : MAX_NETWORK_RANGES;
        
        for (int i = 0; i < auth->num_networks; i++) {
            json_object *net = json_object_array_get_idx(networks_obj, i);
            auth->allowed_networks[i] = strdup(json_object_get_string(net));
        }
    }

    // Extract max runtime
    json_object *runtime_obj;
    if (json_object_object_get_ex(root, "max_runtime_hours", &runtime_obj)) {
        auth->max_runtime_hours = json_object_get_int64(runtime_obj);
    }

    auth->require_auth = true;
    auth->audit_enabled = true;
    strncpy(auth->audit_log_path, "/var/log/mirai2026/audit.log", 511);

    json_object_put(root);

    log_info("Authorization initialized: researcher=%s, project=%s, expires=%ld",
             auth->researcher_id, auth->project_id, auth->expires_at);

    return auth;
}

bool auth_verify(auth_config_t *auth) {
    if (!auth) {
        log_error("Authorization not initialized");
        return false;
    }

    if (!auth->require_auth) {
        log_warn("Authorization bypass enabled (for development only)");
        return true;
    }

    // Check token format (UUID)
    if (strlen(auth->token) != TOKEN_LENGTH) {
        log_error("Invalid token format");
        return false;
    }

    // Check expiration
    time_t now = time(NULL);
    if (now > auth->expires_at) {
        log_error("Authorization expired: %ld > %ld", now, auth->expires_at);
        return false;
    }

    // Check researcher ID
    if (strlen(auth->researcher_id) == 0) {
        log_error("Missing researcher ID");
        return false;
    }

    // Check project ID
    if (strlen(auth->project_id) == 0) {
        log_error("Missing project ID");
        return false;
    }

    log_info("Authorization verified: %s/%s", auth->researcher_id, auth->project_id);
    return true;
}

bool auth_check_operation(auth_config_t *auth, const char *operation) {
    if (!auth || !operation) {
        return false;
    }

    if (!auth->require_auth) {
        return true;
    }

    for (int i = 0; i < auth->num_operations; i++) {
        if (strcmp(auth->authorized_operations[i], operation) == 0) {
            log_debug("Operation authorized: %s", operation);
            return true;
        }
    }

    log_error("Operation NOT authorized: %s", operation);
    return false;
}

bool auth_check_operation_type(auth_config_t *auth, operation_type_t op_type) {
    const char *op_names[] = {
        "scan:local_network",
        "scan:internet",
        "honeypot:deploy",
        "honeypot:monitor",
        "analysis:passive",
        "analysis:active",
        "attack:test",
        "credential:test",
        "device:access",
        "data:collection"
    };

    if (op_type < 0 || op_type >= sizeof(op_names) / sizeof(op_names[0])) {
        return false;
    }

    return auth_check_operation(auth, op_names[op_type]);
}

bool auth_check_network(auth_config_t *auth, const char *target_ip) {
    if (!auth || !target_ip) {
        return false;
    }

    if (!auth->require_auth || auth->num_networks == 0) {
        return true; // No restrictions
    }

    for (int i = 0; i < auth->num_networks; i++) {
        if (ip_in_cidr(target_ip, auth->allowed_networks[i])) {
            log_debug("Network authorized: %s in %s", target_ip, auth->allowed_networks[i]);
            return true;
        }
    }

    log_error("Network NOT authorized: %s", target_ip);
    return false;
}

bool auth_runtime_exceeded(auth_config_t *auth, time_t start_time) {
    if (!auth || auth->max_runtime_hours == 0) {
        return false;
    }

    time_t now = time(NULL);
    time_t elapsed_hours = (now - start_time) / 3600;

    if (elapsed_hours > auth->max_runtime_hours) {
        log_error("Runtime limit exceeded: %ld hours > %ld hours",
                  elapsed_hours, auth->max_runtime_hours);
        return true;
    }

    return false;
}

const char *auth_get_status(auth_config_t *auth) {
    static char status[512];
    
    if (!auth) {
        return "NOT INITIALIZED";
    }

    time_t now = time(NULL);
    time_t remaining = auth->expires_at - now;
    
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wformat-truncation"
    snprintf(status, sizeof(status),
             "Researcher: %s | Project: %s | Expires in: %ld hours | Operations: %d | Networks: %d",
             auth->researcher_id, auth->project_id,
             remaining / 3600, auth->num_operations, auth->num_networks);
#pragma GCC diagnostic pop
    
    return status;
}

void auth_destroy(auth_config_t *auth) {
    if (auth) {
        for (int i = 0; i < auth->num_operations; i++) {
            free(auth->authorized_operations[i]);
        }
        for (int i = 0; i < auth->num_networks; i++) {
            free(auth->allowed_networks[i]);
        }
        free(auth);
    }
}

/**
 * Authorization Framework - Mirai 2026
 * 
 * Purpose: Enforce authorized research operations only
 * 
 * Features:
 * - Token-based authorization (UUID)
 * - Expiration checking
 * - Operation-level permissions
 * - Network restriction enforcement
 * - Audit trail integration
 */

#ifndef AUTHORIZATION_H
#define AUTHORIZATION_H

#include <stdbool.h>
#include <time.h>

#define MAX_AUTHORIZED_OPS 32
#define MAX_NETWORK_RANGES 16
#define TOKEN_LENGTH 36  // UUID format

/**
 * Authorization configuration
 */
typedef struct {
    char token[TOKEN_LENGTH + 1];        // Authorization token (UUID)
    time_t issued_at;                    // When token was issued
    time_t expires_at;                   // Token expiration
    char researcher_id[256];             // Researcher identifier
    char project_id[256];                // Project identifier
    bool require_auth;                   // Enforce authorization?
    
    // Authorized operations
    char *authorized_operations[MAX_AUTHORIZED_OPS];
    int num_operations;
    
    // Network restrictions
    char *allowed_networks[MAX_NETWORK_RANGES];
    int num_networks;
    
    // Runtime limits
    time_t max_runtime_hours;
    
    // Audit
    bool audit_enabled;
    char audit_log_path[512];
} auth_config_t;

/**
 * Operation types
 */
typedef enum {
    OP_SCAN_LOCAL,           // Scan local network
    OP_SCAN_INTERNET,        // Scan Internet (usually prohibited)
    OP_HONEYPOT_DEPLOY,      // Deploy honeypot
    OP_HONEYPOT_MONITOR,     // Monitor honeypot
    OP_ANALYSIS_PASSIVE,     // Passive analysis only
    OP_ANALYSIS_ACTIVE,      // Active analysis
    OP_ATTACK_TEST,          // Attack testing (isolated only)
    OP_CREDENTIAL_TEST,      // Test credentials
    OP_DEVICE_ACCESS,        // Access devices
    OP_DATA_COLLECTION       // Collect data
} operation_type_t;

/**
 * Initialize authorization system from config file
 * 
 * @param config_file Path to authorization token file (JSON)
 * @return Initialized authorization config, or NULL on failure
 */
auth_config_t *auth_init(const char *config_file);

/**
 * Verify authorization is valid
 * Checks: token format, expiration, project/researcher IDs
 * 
 * @param auth Authorization configuration
 * @return true if authorized, false otherwise
 */
bool auth_verify(auth_config_t *auth);

/**
 * Check if specific operation is authorized
 * 
 * @param auth Authorization configuration
 * @param operation Operation identifier (e.g., "scan:local_network")
 * @return true if authorized, false otherwise
 */
bool auth_check_operation(auth_config_t *auth, const char *operation);

/**
 * Check if operation type is authorized
 * 
 * @param auth Authorization configuration
 * @param op_type Operation type enum
 * @return true if authorized, false otherwise
 */
bool auth_check_operation_type(auth_config_t *auth, operation_type_t op_type);

/**
 * Check if target IP/network is authorized
 * 
 * @param auth Authorization configuration
 * @param target_ip Target IP address
 * @return true if authorized, false otherwise
 */
bool auth_check_network(auth_config_t *auth, const char *target_ip);

/**
 * Check if runtime limit exceeded
 * 
 * @param auth Authorization configuration
 * @param start_time Program start time
 * @return true if limit exceeded, false otherwise
 */
bool auth_runtime_exceeded(auth_config_t *auth, time_t start_time);

/**
 * Get authorization status summary
 * 
 * @param auth Authorization configuration
 * @return Human-readable status string
 */
const char *auth_get_status(auth_config_t *auth);

/**
 * Cleanup authorization resources
 */
void auth_destroy(auth_config_t *auth);

#endif // AUTHORIZATION_H

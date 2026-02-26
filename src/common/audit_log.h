/**
 * Audit Logging System - Mirai 2026
 *
 * Purpose: Track all security-relevant events for accountability
 *
 * Features:
 * - JSON-formatted audit logs
 * - Tamper-evident (append-only)
 * - Structured event types
 * - Researcher attribution
 * - Compliance ready
 */

#ifndef AUDIT_LOG_H
#define AUDIT_LOG_H

#include <time.h>

/**
 * Audit event types
 */
typedef enum {
  AUDIT_STARTUP,               // Program started
  AUDIT_SHUTDOWN,              // Program stopped
  AUDIT_AUTH_SUCCESS,          // Authorization verified
  AUDIT_AUTH_FAILURE,          // Authorization failed
  AUDIT_SCAN_START,            // Network scan started
  AUDIT_SCAN_STOP,             // Network scan stopped
  AUDIT_DEVICE_FOUND,          // IoT device discovered
  AUDIT_CREDENTIAL_ATTEMPT,    // Credential tested
  AUDIT_DEVICE_COMPROMISED,    // Device accessed
  AUDIT_ATTACK_LAUNCHED,       // Attack executed
  AUDIT_KILL_SWITCH_ACTIVATED, // Kill switch triggered
  AUDIT_HONEYPOT_DEPLOYED,     // Honeypot started
  AUDIT_HONEYPOT_STOPPED,      // Honeypot stopped
  AUDIT_DATA_COLLECTED,        // Data collection event
  AUDIT_NETWORK_VIOLATION,     // Unauthorized network access attempted
  AUDIT_OPERATION_DENIED       // Operation denied by authorization
} audit_event_t;

/**
 * Initialize audit logging system
 *
 * @param log_path Path to audit log file (default:
 * /var/log/mirai2026/audit.log)
 * @param researcher_id Researcher identifier
 * @param project_id Project identifier
 * @return 0 on success, -1 on failure
 */
int audit_log_init(const char *log_path, const char *researcher_id,
                   const char *project_id);

/**
 * Log auditable event
 *
 * @param event Event type
 * @param details Human-readable event details
 */
void audit_log(audit_event_t event, const char *details);

/**
 * Log event with additional metadata
 *
 * @param event Event type
 * @param target Target IP/device (optional, can be NULL)
 * @param details Event details
 */
void audit_log_with_target(audit_event_t event, const char *target,
                           const char *details);

/**
 * Log authorization token (on startup)
 *
 * @param token Authorization token
 */
void audit_log_token(const char *token);

/**
 * Close audit logging system
 */
void audit_log_close(void);

#endif // AUDIT_LOG_H

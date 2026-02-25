/**
 * Kill Switch Implementation - Mirai 2026
 * 
 * Purpose: Emergency shutdown mechanisms for ethical research
 * 
 * Features:
 * - Remote kill switch (HTTP-based)
 * - Time-based auto-termination
 * - Signal-based manual shutdown
 * - Authorization verification
 */

#ifndef KILL_SWITCH_H
#define KILL_SWITCH_H

#include <stdbool.h>
#include <time.h>

/**
 * Remote kill switch configuration
 * Checks a URL periodically - if server returns non-200, terminate
 */
typedef struct {
    char *url;                    // Kill switch check URL
    int check_interval_seconds;   // How often to check (default: 60)
    bool enabled;                 // Kill switch active?
    time_t last_check;           // Last check timestamp
    int consecutive_failures;     // Failed checks (terminate after 3)
} kill_switch_t;

/**
 * Time-based kill switch
 * Automatically terminates after maximum runtime
 */
typedef struct {
    time_t start_time;           // When program started
    time_t max_runtime_seconds;  // Maximum allowed runtime
    bool enabled;                // Time limit active?
} time_limit_t;

/**
 * Combined kill switch status
 */
typedef struct {
    kill_switch_t *remote;       // Remote HTTP kill switch
    time_limit_t *time_limit;    // Time-based limit
    bool manual_triggered;       // Manual shutdown via signal
    char *reason;                // Termination reason (for logging)
} kill_switch_status_t;

/**
 * Initialize remote kill switch
 * 
 * @param url URL to check for kill signal (must return 200 OK to continue)
 * @param interval Check interval in seconds (recommended: 60)
 * @return Initialized kill switch structure, or NULL on failure
 */
kill_switch_t *kill_switch_init(const char *url, int interval);

/**
 * Check if remote kill signal received
 * 
 * @param ks Kill switch instance
 * @return true if should terminate, false if safe to continue
 */
bool kill_switch_check(kill_switch_t *ks);

/**
 * Initialize time-based kill switch
 * 
 * @param max_runtime_seconds Maximum runtime (recommended: 86400 = 24 hours)
 * @return Initialized time limit structure
 */
time_limit_t *time_limit_init(time_t max_runtime_seconds);

/**
 * Check if time limit exceeded
 * 
 * @param tl Time limit instance
 * @return true if time limit exceeded, false otherwise
 */
bool time_limit_exceeded(time_limit_t *tl);

/**
 * Initialize combined kill switch system
 * 
 * @param remote_url URL for remote kill switch (NULL to disable)
 * @param max_runtime Maximum runtime in seconds (0 to disable)
 * @return Combined kill switch status
 */
kill_switch_status_t *kill_switch_system_init(const char *remote_url, time_t max_runtime);

/**
 * Check all kill switches
 * 
 * @param status Combined kill switch status
 * @return true if should terminate, false if safe to continue
 */
bool kill_switch_should_terminate(kill_switch_status_t *status);

/**
 * Get termination reason (for logging)
 * 
 * @param status Kill switch status
 * @return Human-readable termination reason
 */
const char *kill_switch_get_reason(kill_switch_status_t *status);

/**
 * Manual kill switch activation (signal handler)
 * 
 * @param status Kill switch status to update
 */
void kill_switch_manual_activate(kill_switch_status_t *status);

/**
 * Cleanup kill switch resources
 */
void kill_switch_destroy(kill_switch_t *ks);
void time_limit_destroy(time_limit_t *tl);
void kill_switch_system_destroy(kill_switch_status_t *status);

#endif // KILL_SWITCH_H

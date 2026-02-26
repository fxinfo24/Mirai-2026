/**
 * @file scanner_modern.h
 * @brief Modern scanner module interface
 */

#ifndef SCANNER_MODERN_H
#define SCANNER_MODERN_H

#include <stddef.h>
#include <stdint.h>

/**
 * Initialize the scanner module
 *
 * @param config_path Path to configuration file (can be NULL for defaults)
 * @param max_connections Maximum number of concurrent connections
 * @return 0 on success, -1 on error
 */
int scanner_modern_init(const char *config_path, size_t max_connections);

/**
 * Start the scanner (blocking call - run in separate thread)
 *
 * @param arg Unused argument for pthread compatibility
 * @return NULL
 */
void *scanner_modern_run(void *arg);

/**
 * Stop the scanner gracefully
 */
void scanner_modern_stop(void);

/**
 * Cleanup all scanner resources
 */
void scanner_modern_cleanup(void);

/**
 * Get scanner statistics
 *
 * @param syns_sent Output: Total SYN packets sent
 * @param successful_auths Output: Successful authentications
 * @param failed_auths Output: Failed authentications
 */
void scanner_modern_get_stats(uint64_t *syns_sent, uint64_t *successful_auths,
                              uint64_t *failed_auths);

#endif // SCANNER_MODERN_H

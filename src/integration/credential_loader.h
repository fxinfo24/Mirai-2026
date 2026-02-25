/**
 * @file credential_loader.h
 * @brief AI-powered credential management with weighted selection
 */

#ifndef CREDENTIAL_LOADER_H
#define CREDENTIAL_LOADER_H

#include <stddef.h>
#include <stdbool.h>
#include "pipeline.h"

/**
 * Initialize credential loader
 */
int credential_loader_init(void);

/**
 * Load credentials from JSON file (from ai/credential_intel/generate.py)
 * 
 * Expected JSON format:
 * {
 *   "credentials": [
 *     {
 *       "username": "admin",
 *       "password": "admin",
 *       "weight": 1.5,
 *       "source": "llm",
 *       "confidence": 0.85
 *     }
 *   ]
 * }
 */
int credential_loader_load_from_json(const char *json_file);

/**
 * Load credentials from simple text file
 * Format: username:password (one per line)
 */
int credential_loader_load_from_text(const char *text_file);

/**
 * Get credential using weighted random selection
 * Higher weight = more likely to be selected
 */
credential_t credential_loader_get_weighted(void);

/**
 * Get credential by index
 */
credential_t credential_loader_get_by_index(size_t index);

/**
 * Get total number of credentials
 */
size_t credential_loader_count(void);

/**
 * Update credential success/failure statistics
 * Automatically adjusts weight based on success rate
 */
void credential_loader_update_result(const char *username, const char *password, bool success);

/**
 * Print credential statistics
 */
void credential_loader_print_stats(void);

/**
 * Cleanup credential loader
 */
void credential_loader_cleanup(void);

#endif /* CREDENTIAL_LOADER_H */

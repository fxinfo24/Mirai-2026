/**
 * @file ai_bridge.h
 * @brief AI integration bridge for LLM-powered features
 * 
 * This module provides the interface between the C bot and Python AI services.
 * Features include:
 * - Credential generation via LLM
 * - Adaptive attack pattern generation
 * - Evasion technique suggestions
 * - Target prioritization using ML
 */

#ifndef AI_BRIDGE_H
#define AI_BRIDGE_H

#include <stdint.h>
#include <stdbool.h>

// AI service endpoints
typedef enum {
    AI_SERVICE_CREDENTIAL_GEN = 0,
    AI_SERVICE_PATTERN_EVASION,
    AI_SERVICE_TARGET_PRIORITY,
    AI_SERVICE_ATTACK_OPTIMIZE
} ai_service_t;

// AI request/response structures
typedef struct {
    ai_service_t service;
    char request_data[4096];
    size_t request_len;
} ai_request_t;

typedef struct {
    bool success;
    char response_data[8192];
    size_t response_len;
    char error_message[256];
} ai_response_t;

// Credential generation request
typedef struct {
    char target_device[128];
    char target_os[64];
    uint32_t breach_year_start;
    uint32_t breach_year_end;
    size_t max_credentials;
} ai_credential_request_t;

// Generated credential
typedef struct {
    char username[64];
    char password[64];
    float confidence_score;
    char source[128];
} ai_credential_t;

/**
 * Initialize AI bridge
 * 
 * @param api_endpoint URL of the AI service (e.g., "http://localhost:5000")
 * @return 0 on success, -1 on error
 */
int ai_bridge_init(const char *api_endpoint);

/**
 * Generate credentials using LLM
 * 
 * @param request Credential generation parameters
 * @param credentials Output array of generated credentials
 * @param max_credentials Maximum number of credentials to generate
 * @return Number of credentials generated, or -1 on error
 */
int ai_bridge_generate_credentials(
    ai_credential_request_t *request,
    ai_credential_t *credentials,
    size_t max_credentials
);

/**
 * Get evasion technique suggestions
 * 
 * @param current_pattern Current attack pattern signature
 * @param suggestions Output buffer for suggestions
 * @param max_suggestions Maximum number of suggestions
 * @return Number of suggestions, or -1 on error
 */
int ai_bridge_get_evasion_techniques(
    const char *current_pattern,
    char suggestions[][256],
    size_t max_suggestions
);

/**
 * Prioritize targets using ML model
 * 
 * @param targets Array of IP addresses
 * @param target_count Number of targets
 * @param scores Output array of priority scores (0.0-1.0)
 * @return 0 on success, -1 on error
 */
int ai_bridge_prioritize_targets(
    uint32_t *targets,
    size_t target_count,
    float *scores
);

/**
 * Send raw request to AI service
 * 
 * @param request Request structure
 * @param response Response structure (output)
 * @return 0 on success, -1 on error
 */
int ai_bridge_send_request(ai_request_t *request, ai_response_t *response);

/**
 * Cleanup AI bridge
 */
void ai_bridge_cleanup(void);

/**
 * Check if AI service is available
 * 
 * @return true if service is reachable, false otherwise
 */
bool ai_bridge_is_available(void);

#endif // AI_BRIDGE_H

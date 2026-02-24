/**
 * @file attack_modern.h
 * @brief Modern attack module interface with pluggable attack vectors
 */

#ifndef ATTACK_MODERN_H
#define ATTACK_MODERN_H

#include <stdint.h>
#include <stdbool.h>
#include <netinet/in.h>

// Attack vector types
typedef enum {
    ATTACK_VECTOR_UDP_FLOOD = 0,
    ATTACK_VECTOR_TCP_SYN,
    ATTACK_VECTOR_TCP_ACK,
    ATTACK_VECTOR_HTTP_FLOOD,
    ATTACK_VECTOR_DNS_AMPLIFICATION,
    ATTACK_VECTOR_GRE_IP,
    ATTACK_VECTOR_GRE_ETH,
    ATTACK_VECTOR_SLOWLORIS,
    ATTACK_VECTOR_MAX
} attack_vector_t;

// Attack target
typedef struct {
    struct sockaddr_in addr;
    char hostname[256];
    uint32_t netmask;
} attack_target_t;

// Attack options (key-value pairs)
typedef struct {
    uint8_t key;
    char value[256];
} attack_option_t;

// Attack option keys
#define ATTACK_OPT_PAYLOAD_SIZE     0
#define ATTACK_OPT_PAYLOAD_RANDOM   1
#define ATTACK_OPT_IP_TOS           2
#define ATTACK_OPT_IP_TTL           3
#define ATTACK_OPT_SPORT            4
#define ATTACK_OPT_DPORT            5
#define ATTACK_OPT_DURATION         6
#define ATTACK_OPT_THREADS          7
#define ATTACK_OPT_HTTP_METHOD      8
#define ATTACK_OPT_HTTP_PATH        9
#define ATTACK_OPT_USER_AGENT       10

// Attack statistics
typedef struct {
    uint64_t packets_sent;
    uint64_t bytes_sent;
    uint64_t errors;
    time_t start_time;
    time_t end_time;
    bool active;
} attack_stats_t;

// Attack handle (opaque)
typedef struct attack_handle attack_handle_t;

/**
 * Initialize attack module
 */
int attack_modern_init(void);

/**
 * Start an attack
 * 
 * @param vector Attack vector type
 * @param targets Array of targets
 * @param target_count Number of targets
 * @param options Array of options
 * @param option_count Number of options
 * @param duration Attack duration in seconds
 * @return Attack handle or NULL on error
 */
attack_handle_t *attack_modern_start(
    attack_vector_t vector,
    attack_target_t *targets,
    size_t target_count,
    attack_option_t *options,
    size_t option_count,
    uint32_t duration
);

/**
 * Stop an ongoing attack
 */
void attack_modern_stop(attack_handle_t *handle);

/**
 * Get attack statistics
 */
void attack_modern_get_stats(attack_handle_t *handle, attack_stats_t *stats);

/**
 * Cleanup attack module
 */
void attack_modern_cleanup(void);

#endif // ATTACK_MODERN_H

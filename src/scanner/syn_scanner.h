/**
 * @file syn_scanner.h
 * @brief High-performance SYN scanner interface
 */

#ifndef SYN_SCANNER_H
#define SYN_SCANNER_H

#include <stdint.h>
#include <stddef.h>

/**
 * Scanner statistics
 */
typedef struct {
    uint64_t syns_sent;
    uint64_t synacks_received;
    uint64_t errors;
} syn_scanner_stats_t;

/**
 * SYN scanner context
 */
typedef struct {
    int raw_sock;
    int epoll_fd;
    
    uint32_t local_ip;
    
    // Target configuration
    uint16_t target_ports[8];
    size_t port_count;
    
    // Statistics
    syn_scanner_stats_t stats;
} syn_scanner_t;

/**
 * Callback for SYN-ACK responses
 * 
 * @param src_ip Source IP that responded
 * @param src_port Source port that responded
 * @param user_data User-provided data
 */
typedef void (*synack_callback_t)(uint32_t src_ip, uint16_t src_port, void *user_data);

/**
 * Initialize SYN scanner
 * 
 * @param scanner Scanner context to initialize
 * @param local_ip Local IP address to use as source
 * @return 0 on success, -1 on error
 */
int syn_scanner_init(syn_scanner_t *scanner, uint32_t local_ip);

/**
 * Send batch of SYN packets
 * 
 * @param scanner Scanner context
 * @param count Number of SYNs to send
 * @return Number of SYNs sent, or -1 on error
 */
int syn_scanner_send_batch(syn_scanner_t *scanner, size_t count);

/**
 * Receive and process SYN-ACK responses
 * 
 * @param scanner Scanner context
 * @param callback Function to call for each SYN-ACK (can be NULL)
 * @param user_data Data to pass to callback
 * @return Number of SYN-ACKs received, or -1 on error
 */
int syn_scanner_recv_synacks(syn_scanner_t *scanner, synack_callback_t callback, void *user_data);

/**
 * Get scanner statistics
 * 
 * @param scanner Scanner context
 * @param stats Output statistics structure
 */
void syn_scanner_get_stats(syn_scanner_t *scanner, syn_scanner_stats_t *stats);

/**
 * Cleanup scanner resources
 * 
 * @param scanner Scanner context
 */
void syn_scanner_cleanup(syn_scanner_t *scanner);

#endif // SYN_SCANNER_H

/**
 * @file checksum.h
 * @brief Checksum calculation utilities for raw packet generation
 */

#ifndef ATTACK_CHECKSUM_H
#define ATTACK_CHECKSUM_H

#include <stdint.h>
#include <netinet/ip.h>

/**
 * Calculate generic internet checksum
 * 
 * @param addr Data to checksum
 * @param count Length in bytes
 * @return 16-bit checksum
 */
uint16_t checksum_generic(uint16_t *addr, uint32_t count);

/**
 * Calculate TCP/UDP checksum with pseudo-header
 * 
 * @param iph IP header
 * @param buff TCP/UDP header + data
 * @param data_len Length of TCP/UDP segment
 * @param len Total length
 * @return 16-bit checksum
 */
uint16_t checksum_tcpudp(struct iphdr *iph, void *buff, uint16_t data_len, int len);

#endif // ATTACK_CHECKSUM_H

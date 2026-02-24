/**
 * @file random_secure.h
 * @brief Secure random number generation interface
 */

#ifndef RANDOM_SECURE_H
#define RANDOM_SECURE_H

#include <stdint.h>
#include <stddef.h>

/**
 * Initialize secure random number generator
 * Must be called before using random functions
 */
void random_secure_init(void);

/**
 * Get cryptographically secure random bytes
 * 
 * @param buf Buffer to fill
 * @param len Number of bytes
 * @return 0 on success, -1 on error
 */
int random_secure_bytes(void *buf, size_t len);

/**
 * Get secure random uint32_t
 */
uint32_t random_secure_uint32(void);

/**
 * Get secure random uint64_t
 */
uint64_t random_secure_uint64(void);

/**
 * Get secure random number in range [min, max]
 */
uint32_t random_secure_range(uint32_t min, uint32_t max);

/**
 * Generate random alphanumeric string
 * 
 * @param buf Output buffer
 * @param len Buffer length (including null terminator)
 */
void random_secure_string(char *buf, size_t len);

#endif // RANDOM_SECURE_H

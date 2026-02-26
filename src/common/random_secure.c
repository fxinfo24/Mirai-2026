/**
 * @file random_secure.c
 * @brief Secure random number generation
 *
 * SECURITY FIX: Replace insecure rand() with cryptographically secure
 * alternatives
 *
 * Original issue: rand() was never seeded, producing same sequence every run
 *
 * @author Mirai 2026 Research Team
 * @date 2026-02-25
 */

#define _GNU_SOURCE
#include "random_secure.h"

#include <fcntl.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/random.h>
#include <time.h>
#include <unistd.h>

#include "logger.h"

static bool g_random_initialized = false;

/**
 * Initialize secure random number generator
 *
 * Uses multiple entropy sources:
 * 1. getrandom() syscall (preferred, kernel entropy)
 * 2. /dev/urandom (fallback)
 * 3. time + PID (last resort)
 */
void random_secure_init(void) {
  if (g_random_initialized) {
    return;
  }

  // Try to seed srand() with secure random data
  unsigned int seed;

#ifdef __linux__
  // Attempt 1: Use getrandom() (Linux 3.17+)
  if (getrandom(&seed, sizeof(seed), GRND_NONBLOCK) == sizeof(seed)) {
    srand(seed);
    log_info("Random initialized with getrandom()");
    g_random_initialized = true;
    return;
  }
#endif

  // Attempt 2: Read from /dev/urandom
  int fd = open("/dev/urandom", O_RDONLY);
  if (fd >= 0) {
    if (read(fd, &seed, sizeof(seed)) == sizeof(seed)) {
      close(fd);
      srand(seed);
      log_info("Random initialized with /dev/urandom");
      g_random_initialized = true;
      return;
    }
    close(fd);
  }

  // Attempt 3: Fallback to time + PID (less secure but better than nothing)
  seed = (unsigned int)(time(NULL) ^ (getpid() << 16));
  srand(seed);
  log_warn("Random initialized with time+PID (weak entropy)");
  g_random_initialized = true;
}

/**
 * Get cryptographically secure random bytes
 *
 * @param buf Buffer to fill with random data
 * @param len Number of bytes to generate
 * @return 0 on success, -1 on error
 */
int random_secure_bytes(void *buf, size_t len) {
  if (!buf || len == 0) {
    return -1;
  }

#ifdef __linux__
  // Use getrandom() if available
  ssize_t ret = getrandom(buf, len, 0);
  if (ret == (ssize_t)len) {
    return 0;
  }
#endif

  // Fallback: Read from /dev/urandom
  int fd = open("/dev/urandom", O_RDONLY);
  if (fd < 0) {
    log_error("Failed to open /dev/urandom");
    return -1;
  }

  ssize_t total = 0;
  while (total < (ssize_t)len) {
    ssize_t n = read(fd, (uint8_t *)buf + total, len - total);
    if (n <= 0) {
      close(fd);
      log_error("Failed to read from /dev/urandom");
      return -1;
    }
    total += n;
  }

  close(fd);
  return 0;
}

/**
 * Get secure random uint32_t
 */
uint32_t random_secure_uint32(void) {
  uint32_t value;

  if (random_secure_bytes(&value, sizeof(value)) != 0) {
    // Fallback to rand() if secure method fails
    if (!g_random_initialized) {
      random_secure_init();
    }
    value = (uint32_t)rand();
  }

  return value;
}

/**
 * Get secure random uint64_t
 */
uint64_t random_secure_uint64(void) {
  uint64_t value;

  if (random_secure_bytes(&value, sizeof(value)) != 0) {
    // Fallback to two rand() calls
    if (!g_random_initialized) {
      random_secure_init();
    }
    value = ((uint64_t)rand() << 32) | (uint64_t)rand();
  }

  return value;
}

/**
 * Get secure random number in range [min, max]
 */
uint32_t random_secure_range(uint32_t min, uint32_t max) {
  if (min >= max) {
    return min;
  }

  uint32_t range = max - min + 1;
  uint32_t value = random_secure_uint32();

  return min + (value % range);
}

/**
 * Generate random alphanumeric string
 */
void random_secure_string(char *buf, size_t len) {
  if (!buf || len == 0) {
    return;
  }

  const char charset[] =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const size_t charset_len = sizeof(charset) - 1;

  for (size_t i = 0; i < len - 1; i++) {
    uint32_t idx = random_secure_range(0, charset_len - 1);
    buf[i] = charset[idx];
  }
  buf[len - 1] = '\0';
}

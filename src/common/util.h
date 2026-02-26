#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

// Memory utilities (safer than standard functions)
void *util_malloc(size_t size);
void *util_calloc(size_t nmemb, size_t size);
void *util_realloc(void *ptr, size_t size);
void util_free(void *ptr);

// String utilities
size_t util_strlen(const char *str);
void util_memcpy(void *dst, const void *src, size_t n);
void util_zero(void *ptr, size_t size);
int util_strcmp(const char *s1, const char *s2);
char *util_strdup(const char *str);

// Memory search
int util_memsearch(const void *haystack, size_t haystack_len,
                   const void *needle, size_t needle_len);

// Network utilities
uint32_t util_local_addr(void);
bool util_is_private_ip(uint32_t ip);
bool util_is_valid_ip(const char *ip_str);

// Random utilities
void util_random_bytes(void *buf, size_t len);
uint32_t util_random_u32(void);

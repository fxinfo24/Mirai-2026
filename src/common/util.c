#define _GNU_SOURCE
#include "util.h"
#include "logger.h"

#include <arpa/inet.h>
#include <ifaddrs.h>
#include <net/if.h>
#include <sodium.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

void *util_malloc(size_t size)
{
    void *ptr = malloc(size);
    if (!ptr && size > 0) {
        log_fatal("Memory allocation failed: size=%zu", size);
        abort();
    }
    return ptr;
}

void *util_calloc(size_t nmemb, size_t size)
{
    void *ptr = calloc(nmemb, size);
    if (!ptr && nmemb > 0 && size > 0) {
        log_fatal("Memory allocation failed: nmemb=%zu size=%zu", nmemb, size);
        abort();
    }
    return ptr;
}

void *util_realloc(void *ptr, size_t size)
{
    void *new_ptr = realloc(ptr, size);
    if (!new_ptr && size > 0) {
        log_fatal("Memory reallocation failed: size=%zu", size);
        abort();
    }
    return new_ptr;
}

void util_free(void *ptr)
{
    free(ptr);
}

size_t util_strlen(const char *str)
{
    return str ? strlen(str) : 0;
}

void util_memcpy(void *dst, const void *src, size_t n)
{
    if (dst && src && n > 0) {
        memcpy(dst, src, n);
    }
}

void util_zero(void *ptr, size_t size)
{
    if (ptr && size > 0) {
        sodium_memzero(ptr, size);
    }
}

int util_strcmp(const char *s1, const char *s2)
{
    if (!s1 && !s2)
        return 0;
    if (!s1)
        return -1;
    if (!s2)
        return 1;
    return strcmp(s1, s2);
}

char *util_strdup(const char *str)
{
    if (!str)
        return NULL;
    return strdup(str);
}

int util_memsearch(const void *haystack, size_t haystack_len, const void *needle,
                   size_t needle_len)
{
    if (!haystack || !needle || needle_len == 0 || haystack_len < needle_len)
        return -1;

    const uint8_t *h = (const uint8_t *)haystack;
    const uint8_t *n = (const uint8_t *)needle;

    for (size_t i = 0; i <= haystack_len - needle_len; i++) {
        if (memcmp(h + i, n, needle_len) == 0) {
            return (int)i;
        }
    }

    return -1;
}

uint32_t util_local_addr(void)
{
    struct ifaddrs *ifaddr, *ifa;
    uint32_t local_addr = 0;

    if (getifaddrs(&ifaddr) == -1) {
        log_error("getifaddrs failed");
        return 0;
    }

    for (ifa = ifaddr; ifa != NULL; ifa = ifa->ifa_next) {
        if (ifa->ifa_addr == NULL)
            continue;

        if (ifa->ifa_addr->sa_family == AF_INET) {
            struct sockaddr_in *addr = (struct sockaddr_in *)ifa->ifa_addr;
            
            // Skip loopback
            if ((ntohl(addr->sin_addr.s_addr) >> 24) == 127)
                continue;

            local_addr = addr->sin_addr.s_addr;
            break;
        }
    }

    freeifaddrs(ifaddr);
    return local_addr;
}

bool util_is_private_ip(uint32_t ip)
{
    uint8_t o1 = ip & 0xff;
    uint8_t o2 = (ip >> 8) & 0xff;

    // 10.0.0.0/8
    if (o1 == 10)
        return true;

    // 172.16.0.0/12
    if (o1 == 172 && o2 >= 16 && o2 < 32)
        return true;

    // 192.168.0.0/16
    if (o1 == 192 && o2 == 168)
        return true;

    return false;
}

bool util_is_valid_ip(const char *ip_str)
{
    struct sockaddr_in sa;
    return inet_pton(AF_INET, ip_str, &(sa.sin_addr)) == 1;
}

void util_random_bytes(void *buf, size_t len)
{
    randombytes_buf(buf, len);
}

uint32_t util_random_u32(void)
{
    return randombytes_uniform(UINT32_MAX);
}

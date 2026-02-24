/**
 * @file test_logger.c
 * @brief Unit tests for logger module
 */

#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <unistd.h>
#include <string.h>

#include "../../src/common/logger.h"

static void test_logger_init(void) {
    printf("TEST: Logger initialization... ");
    
    int result = logger_init(LOG_LEVEL_DEBUG, NULL);
    assert(result == 0);
    
    logger_cleanup();
    
    printf("PASS\n");
}

static void test_logger_levels(void) {
    printf("TEST: Logger levels... ");
    
    logger_init(LOG_LEVEL_INFO, NULL);
    
    log_debug("This debug message should not appear");
    log_info("This info message should appear");
    log_warn("This warning message should appear");
    log_error("This error message should appear");
    
    logger_cleanup();
    
    printf("PASS\n");
}

static void test_logger_file(void) {
    printf("TEST: Logger file output... ");
    
    const char *log_file = "/tmp/test_mirai.log";
    unlink(log_file);
    
    logger_init(LOG_LEVEL_DEBUG, log_file);
    
    log_info("Test message to file");
    
    logger_cleanup();
    
    // Check file exists
    FILE *f = fopen(log_file, "r");
    assert(f != NULL);
    
    char line[256];
    bool found = false;
    while (fgets(line, sizeof(line), f)) {
        if (strstr(line, "Test message to file")) {
            found = true;
            break;
        }
    }
    
    fclose(f);
    unlink(log_file);
    
    assert(found);
    
    printf("PASS\n");
}

int main(void) {
    printf("Running logger unit tests...\n");
    printf("========================================\n");
    
    test_logger_init();
    test_logger_levels();
    test_logger_file();
    
    printf("========================================\n");
    printf("All logger tests completed!\n");
    
    return 0;
}

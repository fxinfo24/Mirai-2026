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

    logger_config_t cfg = {0};
    cfg.min_level = LOG_LEVEL_DEBUG;
    cfg.output_file  = NULL;
    bool result = logger_init(&cfg);
    assert(result == true);

    logger_shutdown();

    printf("PASS\n");
}

static void test_logger_levels(void) {
    printf("TEST: Logger levels... ");

    logger_config_t cfg = {0};
    cfg.min_level = LOG_LEVEL_INFO;
    cfg.output_file  = NULL;
    logger_init(&cfg);

    log_debug("This debug message should not appear");
    log_info("This info message should appear");
    log_warn("This warning message should appear");
    log_error("This error message should appear");

    logger_shutdown();

    printf("PASS\n");
}

static void test_logger_file(void) {
    printf("TEST: Logger file output... ");

    const char *log_file = "/tmp/test_mirai.log";
    unlink(log_file);

    logger_config_t cfg = {0};
    cfg.min_level = LOG_LEVEL_DEBUG;
    cfg.output_file  = log_file;
    logger_init(&cfg);

    log_info("Test message to file");

    logger_shutdown();
    
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

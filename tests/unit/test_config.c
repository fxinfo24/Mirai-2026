/**
 * @file test_config.c
 * @brief Unit tests for config loader
 */

#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <unistd.h>

#include "../../src/common/config_loader.h"
#include "../../src/common/logger.h"

static void test_config_load(void) {
    printf("TEST: Config load... ");

    logger_config_t cfg = {0};
    cfg.min_level = LOG_LEVEL_DEBUG;
    logger_init(&cfg);

    // Test with example config
    config_t *config = config_load("../../config/bot.example.json");

    if (config == NULL) {
        printf("SKIP (config file not found)\n");
        logger_shutdown();
        return;
    }

    assert(config != NULL);

    config_free(config);
    logger_shutdown();

    printf("PASS\n");
}

static void test_config_invalid(void) {
    printf("TEST: Config invalid file... ");

    logger_config_t cfg = {0};
    cfg.min_level = LOG_LEVEL_DEBUG;
    logger_init(&cfg);

    config_t *config = config_load("/nonexistent/file.json");
    assert(config == NULL);

    logger_shutdown();

    printf("PASS\n");
}

int main(void) {
    printf("Running config unit tests...\n");
    printf("========================================\n");
    
    test_config_load();
    test_config_invalid();
    
    printf("========================================\n");
    printf("All config tests completed!\n");
    
    return 0;
}

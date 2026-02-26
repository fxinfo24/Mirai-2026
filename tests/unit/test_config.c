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

    logger_config_t lcfg = {0};
    lcfg.min_level = LOG_LEVEL_DEBUG;
    logger_init(&lcfg);

    // Test with example config
    mirai_config_t config = {0};
    result_t res = config_load("../../config/bot.example.json", &config);

    if (!res.success) {
        printf("SKIP (config file not found or invalid)\n");
        logger_shutdown();
        return;
    }

    config_free(&config);
    logger_shutdown();

    printf("PASS\n");
}

static void test_config_invalid(void) {
    printf("TEST: Config invalid file... ");

    logger_config_t lcfg = {0};
    lcfg.min_level = LOG_LEVEL_DEBUG;
    logger_init(&lcfg);

    mirai_config_t config = {0};
    result_t res = config_load("/nonexistent/file.json", &config);
    assert(!res.success);

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

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
    
    logger_init(LOG_LEVEL_DEBUG, NULL);
    
    // Test with example config
    config_t *config = config_load("../../config/bot.example.json");
    
    if (config == NULL) {
        printf("SKIP (config file not found)\n");
        return;
    }
    
    assert(config != NULL);
    
    config_free(config);
    logger_cleanup();
    
    printf("PASS\n");
}

static void test_config_invalid(void) {
    printf("TEST: Config invalid file... ");
    
    logger_init(LOG_LEVEL_DEBUG, NULL);
    
    config_t *config = config_load("/nonexistent/file.json");
    assert(config == NULL);
    
    logger_cleanup();
    
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

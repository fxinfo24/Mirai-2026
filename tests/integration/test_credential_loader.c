/**
 * @file test_credential_loader.c
 * @brief Test credential loader functionality
 */

#include <stdio.h>
#include <assert.h>
#include <string.h>
#include "../../src/integration/credential_loader.h"
#include "../../src/common/logger.h"

// Test JSON content
static const char *test_json = 
"{\n"
"  \"credentials\": [\n"
"    {\"username\": \"admin\", \"password\": \"admin\", \"weight\": 2.0, \"source\": \"llm\", \"confidence\": 0.9},\n"
"    {\"username\": \"root\", \"password\": \"root\", \"weight\": 1.5, \"source\": \"llm\", \"confidence\": 0.8},\n"
"    {\"username\": \"admin\", \"password\": \"password\", \"weight\": 1.0, \"source\": \"baseline\", \"confidence\": 0.5}\n"
"  ]\n"
"}\n";

// Test text content
static const char *test_text =
"admin:admin\n"
"root:root\n"
"admin:password\n"
"# Comment line\n"
"user:user\n";

void test_json_loading(void) {
    printf("Test 1: JSON loading...\n");
    
    // Write test JSON to file
    FILE *fp = fopen("/tmp/test_creds.json", "w");
    assert(fp != NULL);
    fputs(test_json, fp);
    fclose(fp);
    
    // Load credentials
    int ret = credential_loader_init();
    assert(ret == 0);
    
    ret = credential_loader_load_from_json("/tmp/test_creds.json");
    assert(ret == 0);
    
    // Check count
    size_t count = credential_loader_count();
    assert(count == 3);
    
    printf("  ✓ Loaded %zu credentials from JSON\n", count);
    
    credential_loader_cleanup();
    printf("  ✓ Test 1 passed!\n\n");
}

void test_text_loading(void) {
    printf("Test 2: Text file loading...\n");
    
    // Write test text to file
    FILE *fp = fopen("/tmp/test_creds.txt", "w");
    assert(fp != NULL);
    fputs(test_text, fp);
    fclose(fp);
    
    // Load credentials
    int ret = credential_loader_init();
    assert(ret == 0);
    
    ret = credential_loader_load_from_text("/tmp/test_creds.txt");
    assert(ret == 0);
    
    // Check count (should be 4, comment line excluded)
    size_t count = credential_loader_count();
    assert(count == 4);
    
    printf("  ✓ Loaded %zu credentials from text\n", count);
    
    credential_loader_cleanup();
    printf("  ✓ Test 2 passed!\n\n");
}

void test_weighted_selection(void) {
    printf("Test 3: Weighted random selection...\n");
    
    // Load test JSON
    FILE *fp = fopen("/tmp/test_creds.json", "w");
    assert(fp != NULL);
    fputs(test_json, fp);
    fclose(fp);
    
    credential_loader_init();
    credential_loader_load_from_json("/tmp/test_creds.json");
    
    // Get multiple credentials and verify they're valid
    int admin_admin_count = 0;
    int root_root_count = 0;
    int admin_password_count = 0;
    
    for (int i = 0; i < 100; i++) {
        credential_t cred = credential_loader_get_weighted();
        assert(strlen(cred.username) > 0);
        assert(strlen(cred.password) > 0);
        
        // Count occurrences
        if (strcmp(cred.username, "admin") == 0 && strcmp(cred.password, "admin") == 0) {
            admin_admin_count++;
        } else if (strcmp(cred.username, "root") == 0 && strcmp(cred.password, "root") == 0) {
            root_root_count++;
        } else if (strcmp(cred.username, "admin") == 0 && strcmp(cred.password, "password") == 0) {
            admin_password_count++;
        }
    }
    
    printf("  ✓ Distribution (100 selections):\n");
    printf("    admin:admin (weight 2.0): %d%%\n", admin_admin_count);
    printf("    root:root (weight 1.5): %d%%\n", root_root_count);
    printf("    admin:password (weight 1.0): %d%%\n", admin_password_count);
    
    // Higher weight should appear more often
    assert(admin_admin_count > admin_password_count);
    
    credential_loader_cleanup();
    printf("  ✓ Test 3 passed!\n\n");
}

void test_success_tracking(void) {
    printf("Test 4: Success rate tracking and weight adjustment...\n");
    
    // Load test JSON
    FILE *fp = fopen("/tmp/test_creds.json", "w");
    assert(fp != NULL);
    fputs(test_json, fp);
    fclose(fp);
    
    credential_loader_init();
    credential_loader_load_from_json("/tmp/test_creds.json");
    
    // Simulate successes for admin:admin
    for (int i = 0; i < 5; i++) {
        credential_loader_update_result("admin", "admin", true);
    }
    
    // Simulate failures for admin:password
    for (int i = 0; i < 3; i++) {
        credential_loader_update_result("admin", "password", false);
    }
    
    printf("  ✓ Updated results:\n");
    printf("    admin:admin - 5 successes (weight should increase)\n");
    printf("    admin:password - 3 failures (weight should decrease)\n");
    
    // Print statistics
    credential_loader_print_stats();
    
    credential_loader_cleanup();
    printf("  ✓ Test 4 passed!\n\n");
}

void test_index_access(void) {
    printf("Test 5: Index-based access...\n");
    
    // Load test JSON
    FILE *fp = fopen("/tmp/test_creds.json", "w");
    assert(fp != NULL);
    fputs(test_json, fp);
    fclose(fp);
    
    credential_loader_init();
    credential_loader_load_from_json("/tmp/test_creds.json");
    
    // Access by index
    for (size_t i = 0; i < credential_loader_count(); i++) {
        credential_t cred = credential_loader_get_by_index(i);
        assert(strlen(cred.username) > 0);
        assert(strlen(cred.password) > 0);
        printf("  [%zu] %s:%s\n", i, cred.username, cred.password);
    }
    
    credential_loader_cleanup();
    printf("  ✓ Test 5 passed!\n\n");
}

int main(void) {
    // Initialize logger
    logger_init(LOG_LEVEL_INFO, NULL);
    
    printf("=================================\n");
    printf("Credential Loader Test Suite\n");
    printf("=================================\n\n");
    
    test_json_loading();
    test_text_loading();
    test_weighted_selection();
    test_success_tracking();
    test_index_access();
    
    printf("=================================\n");
    printf("✅ All tests passed!\n");
    printf("=================================\n");
    
    logger_cleanup();
    return 0;
}

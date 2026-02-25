/**
 * @file credential_loader_example.c
 * @brief Example usage of AI-powered credential loader
 * 
 * Demonstrates how to:
 * 1. Generate credentials using AI
 * 2. Load them into the scanner
 * 3. Use weighted selection
 * 4. Track success rates
 */

#include <stdio.h>
#include <stdlib.h>
#include "../src/integration/credential_loader.h"
#include "../src/common/logger.h"

int main(int argc, char **argv) {
    logger_init(LOG_LEVEL_INFO, NULL);
    
    printf("=== Credential Loader Example ===\n\n");
    
    // Step 1: Generate credentials using AI
    printf("Step 1: Generate credentials\n");
    printf("  Run: cd ai && python credential_intel/generate_enhanced.py \\\n");
    printf("         --device-type router \\\n");
    printf("         --count 50 \\\n");
    printf("         --output /tmp/credentials.json \\\n");
    printf("         --format json\n\n");
    
    // Step 2: Initialize credential loader
    printf("Step 2: Initialize credential loader\n");
    if (credential_loader_init() != 0) {
        printf("  ✗ Failed to initialize\n");
        return 1;
    }
    printf("  ✓ Initialized\n\n");
    
    // Step 3: Load credentials
    printf("Step 3: Load credentials\n");
    
    const char *cred_file = "/tmp/credentials.json";
    if (argc > 1) {
        cred_file = argv[1];
    }
    
    printf("  Loading from: %s\n", cred_file);
    
    if (credential_loader_load_from_json(cred_file) != 0) {
        // Fallback to text file if JSON fails
        printf("  JSON failed, trying text format...\n");
        if (credential_loader_load_from_text(cred_file) != 0) {
            printf("  ✗ Failed to load credentials\n");
            credential_loader_cleanup();
            return 1;
        }
    }
    
    size_t count = credential_loader_count();
    printf("  ✓ Loaded %zu credentials\n\n", count);
    
    // Step 4: Weighted selection example
    printf("Step 4: Weighted random selection\n");
    printf("  Selecting 10 credentials (higher weight = more likely):\n\n");
    
    for (int i = 0; i < 10; i++) {
        credential_t cred = credential_loader_get_weighted();
        printf("    %2d. %s:%s\n", i + 1, cred.username, cred.password);
    }
    printf("\n");
    
    // Step 5: Simulate some brute force attempts
    printf("Step 5: Simulate brute force attempts\n");
    printf("  Simulating 20 login attempts with random success/failure:\n\n");
    
    for (int i = 0; i < 20; i++) {
        credential_t cred = credential_loader_get_weighted();
        
        // Simulate random success (30% success rate)
        bool success = (rand() % 100) < 30;
        
        // Update statistics
        credential_loader_update_result(cred.username, cred.password, success);
        
        printf("    [%2d] %s:%s - %s\n", i + 1, cred.username, cred.password,
               success ? "✓ SUCCESS" : "✗ FAILED");
    }
    printf("\n");
    
    // Step 6: View statistics
    printf("Step 6: View credential statistics\n");
    credential_loader_print_stats();
    printf("\n");
    
    // Step 7: Cleanup
    printf("Step 7: Cleanup\n");
    credential_loader_cleanup();
    printf("  ✓ Cleanup complete\n\n");
    
    logger_cleanup();
    
    printf("=== Example Complete ===\n");
    printf("\nNext steps:\n");
    printf("  1. Integrate with pipeline.c for real scanning\n");
    printf("  2. Credentials with high success rates will get higher weights\n");
    printf("  3. Failed credentials will be used less frequently\n");
    printf("  4. System learns which credentials work best\n");
    
    return 0;
}

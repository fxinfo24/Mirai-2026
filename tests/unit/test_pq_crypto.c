/**
 * Unit tests for post-quantum cryptography
 */

#include "../../src/common/pq_crypto.h"
#include "../../src/common/logger.h"
#include <stdio.h>
#include <string.h>
#include <assert.h>

void test_pq_crypto_init() {
    printf("Test: pq_crypto_init\n");
    assert(pq_crypto_init() == 0);
    printf("  ✓ Initialization successful\n");
}

void test_keypair_generation() {
    printf("Test: pq_keypair_generate\n");
    
    pq_keypair_t keypair;
    assert(pq_keypair_generate(&keypair) == 0);
    
    // Verify keys are not all zeros
    int pk_nonzero = 0, sk_nonzero = 0;
    for (size_t i = 0; i < DILITHIUM_PUBLICKEY_BYTES; i++) {
        if (keypair.public_key[i] != 0) pk_nonzero = 1;
    }
    for (size_t i = 0; i < DILITHIUM_SECRETKEY_BYTES; i++) {
        if (keypair.secret_key[i] != 0) sk_nonzero = 1;
    }
    
    assert(pk_nonzero && sk_nonzero);
    printf("  ✓ Key pair generated successfully\n");
}

void test_sign_and_verify() {
    printf("Test: pq_sign and pq_verify\n");
    
    pq_keypair_t keypair;
    pq_keypair_generate(&keypair);
    
    const char *message = "Hello, post-quantum world!";
    pq_signature_t signature;
    
    // Sign message
    assert(pq_sign(&signature, (const uint8_t *)message, strlen(message), keypair.secret_key) == 0);
    printf("  ✓ Message signed\n");
    
    // Verify signature
    assert(pq_verify(&signature, (const uint8_t *)message, strlen(message), keypair.public_key) == true);
    printf("  ✓ Signature verified\n");
    
    // Verify wrong message fails
    const char *wrong_message = "Wrong message";
    assert(pq_verify(&signature, (const uint8_t *)wrong_message, strlen(wrong_message), keypair.public_key) == false);
    printf("  ✓ Wrong message correctly rejected\n");
}

void test_firmware_signing() {
    printf("Test: pq_sign_firmware and pq_verify_firmware\n");
    
    pq_keypair_t keypair;
    pq_keypair_generate(&keypair);
    
    // Create dummy firmware
    uint8_t firmware[1024];
    for (size_t i = 0; i < sizeof(firmware); i++) {
        firmware[i] = i % 256;
    }
    
    pq_signature_t signature;
    
    // Sign firmware
    assert(pq_sign_firmware(&signature, firmware, sizeof(firmware), keypair.secret_key) == 0);
    printf("  ✓ Firmware signed\n");
    
    // Verify firmware
    assert(pq_verify_firmware(&signature, firmware, sizeof(firmware), keypair.public_key) == true);
    printf("  ✓ Firmware signature verified\n");
    
    // Modify firmware and verify fails
    firmware[0] ^= 0xFF;
    assert(pq_verify_firmware(&signature, firmware, sizeof(firmware), keypair.public_key) == false);
    printf("  ✓ Modified firmware correctly rejected\n");
}

void test_key_export_import() {
    printf("Test: pq_export_public_key and pq_import_public_key\n");
    
    pq_keypair_t keypair;
    pq_keypair_generate(&keypair);
    
    const char *filename = "/tmp/test_pq_pubkey.bin";
    
    // Export public key
    assert(pq_export_public_key(keypair.public_key, filename) == 0);
    printf("  ✓ Public key exported\n");
    
    // Import public key
    uint8_t imported_key[DILITHIUM_PUBLICKEY_BYTES];
    assert(pq_import_public_key(imported_key, filename) == 0);
    printf("  ✓ Public key imported\n");
    
    // Verify keys match
    assert(memcmp(keypair.public_key, imported_key, DILITHIUM_PUBLICKEY_BYTES) == 0);
    printf("  ✓ Imported key matches original\n");
    
    // Cleanup
    remove(filename);
}

int main() {
    log_init(LOG_INFO);
    
    printf("========================================\n");
    printf("Post-Quantum Cryptography Tests\n");
    printf("========================================\n\n");
    
    test_pq_crypto_init();
    test_keypair_generation();
    test_sign_and_verify();
    test_firmware_signing();
    test_key_export_import();
    
    printf("\n========================================\n");
    printf("All tests passed! ✓\n");
    printf("========================================\n");
    
    return 0;
}

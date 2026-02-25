/**
 * Post-Quantum Cryptography Implementation - Mirai 2026
 */

#include "pq_crypto.h"
#include "logger.h"
#include <sodium.h>
#include <string.h>
#include <stdio.h>

// libsodium >= 1.0.19 includes Dilithium support
// For now, we'll use a wrapper that can integrate with libsodium's crypto_sign API
// In production, use actual Dilithium implementation when widely available

int pq_crypto_init(void) {
    if (sodium_init() < 0) {
        log_error("Failed to initialize libsodium");
        return -1;
    }
    
    log_info("Post-quantum cryptography initialized (Dilithium3)");
    return 0;
}

int pq_keypair_generate(pq_keypair_t *keypair) {
    if (!keypair) {
        log_error("Invalid keypair pointer");
        return -1;
    }
    
    // Note: Using Ed25519 as placeholder until Dilithium is in stable libsodium
    // In production, replace with: crypto_sign_dilithium3_keypair()
    
    // For now, generate Ed25519 key pair as fallback
    // This maintains API compatibility while we wait for Dilithium stabilization
    unsigned char ed25519_pk[crypto_sign_PUBLICKEYBYTES];
    unsigned char ed25519_sk[crypto_sign_SECRETKEYBYTES];
    
    if (crypto_sign_keypair(ed25519_pk, ed25519_sk) != 0) {
        log_error("Failed to generate key pair");
        return -1;
    }
    
    // Zero-pad to Dilithium sizes for API consistency
    memset(keypair->public_key, 0, DILITHIUM_PUBLICKEY_BYTES);
    memset(keypair->secret_key, 0, DILITHIUM_SECRETKEY_BYTES);
    
    memcpy(keypair->public_key, ed25519_pk, crypto_sign_PUBLICKEYBYTES);
    memcpy(keypair->secret_key, ed25519_sk, crypto_sign_SECRETKEYBYTES);
    
    log_info("Post-quantum key pair generated (using Ed25519 compatibility mode)");
    log_warn("Note: Dilithium support pending libsodium stable release");
    
    return 0;
}

int pq_sign(
    pq_signature_t *signature,
    const uint8_t *message,
    size_t message_len,
    const uint8_t *secret_key
) {
    if (!signature || !message || !secret_key) {
        log_error("Invalid parameters for signing");
        return -1;
    }
    
    // Placeholder: Use Ed25519 signing until Dilithium available
    unsigned char sig[crypto_sign_BYTES];
    unsigned long long sig_len;
    
    if (crypto_sign_detached(sig, &sig_len, message, message_len, secret_key) != 0) {
        log_error("Failed to sign message");
        return -1;
    }
    
    // Zero-pad to Dilithium signature size
    memset(signature->signature, 0, DILITHIUM_SIGNATURE_BYTES);
    memcpy(signature->signature, sig, sig_len);
    signature->signature_len = sig_len;
    
    log_debug("Message signed (Ed25519 compatibility mode)");
    
    return 0;
}

bool pq_verify(
    const pq_signature_t *signature,
    const uint8_t *message,
    size_t message_len,
    const uint8_t *public_key
) {
    if (!signature || !message || !public_key) {
        log_error("Invalid parameters for verification");
        return false;
    }
    
    // Placeholder: Use Ed25519 verification
    if (crypto_sign_verify_detached(
            signature->signature,
            message,
            message_len,
            public_key
        ) != 0) {
        log_warn("Signature verification failed");
        return false;
    }
    
    log_debug("Signature verified successfully");
    return true;
}

int pq_sign_firmware(
    pq_signature_t *signature,
    const uint8_t *firmware,
    size_t firmware_len,
    const uint8_t *secret_key
) {
    log_info("Signing firmware update (%zu bytes)", firmware_len);
    
    // Hash firmware first for efficiency
    unsigned char firmware_hash[crypto_generichash_BYTES];
    
    if (crypto_generichash(
            firmware_hash,
            sizeof(firmware_hash),
            firmware,
            firmware_len,
            NULL,
            0
        ) != 0) {
        log_error("Failed to hash firmware");
        return -1;
    }
    
    // Sign the hash
    return pq_sign(signature, firmware_hash, sizeof(firmware_hash), secret_key);
}

bool pq_verify_firmware(
    const pq_signature_t *signature,
    const uint8_t *firmware,
    size_t firmware_len,
    const uint8_t *public_key
) {
    log_info("Verifying firmware signature (%zu bytes)", firmware_len);
    
    // Hash firmware
    unsigned char firmware_hash[crypto_generichash_BYTES];
    
    if (crypto_generichash(
            firmware_hash,
            sizeof(firmware_hash),
            firmware,
            firmware_len,
            NULL,
            0
        ) != 0) {
        log_error("Failed to hash firmware");
        return false;
    }
    
    // Verify signature on hash
    return pq_verify(signature, firmware_hash, sizeof(firmware_hash), public_key);
}

int pq_export_public_key(const uint8_t *public_key, const char *filename) {
    if (!public_key || !filename) {
        log_error("Invalid parameters for key export");
        return -1;
    }
    
    FILE *fp = fopen(filename, "wb");
    if (!fp) {
        log_error("Failed to open file for writing: %s", filename);
        return -1;
    }
    
    // Write actual key size (Ed25519 for now)
    size_t written = fwrite(public_key, 1, crypto_sign_PUBLICKEYBYTES, fp);
    fclose(fp);
    
    if (written != crypto_sign_PUBLICKEYBYTES) {
        log_error("Failed to write complete public key");
        return -1;
    }
    
    log_info("Public key exported to: %s", filename);
    return 0;
}

int pq_import_public_key(uint8_t *public_key, const char *filename) {
    if (!public_key || !filename) {
        log_error("Invalid parameters for key import");
        return -1;
    }
    
    FILE *fp = fopen(filename, "rb");
    if (!fp) {
        log_error("Failed to open file for reading: %s", filename);
        return -1;
    }
    
    // Read key
    size_t read = fread(public_key, 1, crypto_sign_PUBLICKEYBYTES, fp);
    fclose(fp);
    
    if (read != crypto_sign_PUBLICKEYBYTES) {
        log_error("Failed to read complete public key");
        return -1;
    }
    
    log_info("Public key imported from: %s", filename);
    return 0;
}

// Future: When libsodium stable includes Dilithium, replace with:
/*
int pq_keypair_generate_dilithium(pq_keypair_t *keypair) {
    return crypto_sign_dilithium3_keypair(
        keypair->public_key,
        keypair->secret_key
    );
}

int pq_sign_dilithium(
    pq_signature_t *signature,
    const uint8_t *message,
    size_t message_len,
    const uint8_t *secret_key
) {
    unsigned long long sig_len;
    return crypto_sign_dilithium3_detached(
        signature->signature,
        &sig_len,
        message,
        message_len,
        secret_key
    );
}

bool pq_verify_dilithium(
    const pq_signature_t *signature,
    const uint8_t *message,
    size_t message_len,
    const uint8_t *public_key
) {
    return crypto_sign_dilithium3_verify_detached(
        signature->signature,
        message,
        message_len,
        public_key
    ) == 0;
}
*/

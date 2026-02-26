/**
 * Post-Quantum Cryptography - Mirai 2026
 *
 * Purpose: CRYSTALS-Dilithium signatures (NIST PQC standard)
 *
 * Features:
 * - Dilithium3 (NIST Level 3 security)
 * - Quantum-resistant signatures for OTA updates
 * - Compatible with libsodium 1.0.19+
 *
 * References:
 * - NIST PQC: https://csrc.nist.gov/projects/post-quantum-cryptography
 * - Dilithium: https://pq-crystals.org/dilithium/
 */

#ifndef PQ_CRYPTO_H
#define PQ_CRYPTO_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

// Dilithium3 parameters (NIST Level 3 security, ~128-bit quantum security)
#define DILITHIUM_PUBLICKEY_BYTES 1952
#define DILITHIUM_SECRETKEY_BYTES 4000
#define DILITHIUM_SIGNATURE_BYTES 3293

/**
 * Post-quantum key pair
 */
typedef struct {
  uint8_t public_key[DILITHIUM_PUBLICKEY_BYTES];
  uint8_t secret_key[DILITHIUM_SECRETKEY_BYTES];
} pq_keypair_t;

/**
 * Post-quantum signature
 */
typedef struct {
  uint8_t signature[DILITHIUM_SIGNATURE_BYTES];
  size_t signature_len;
} pq_signature_t;

/**
 * Initialize post-quantum cryptography
 *
 * @return 0 on success, -1 on failure
 */
int pq_crypto_init(void);

/**
 * Generate Dilithium key pair
 *
 * @param keypair Output key pair
 * @return 0 on success, -1 on failure
 */
int pq_keypair_generate(pq_keypair_t *keypair);

/**
 * Sign message with Dilithium
 *
 * @param signature Output signature
 * @param message Message to sign
 * @param message_len Message length
 * @param secret_key Secret key for signing
 * @return 0 on success, -1 on failure
 */
int pq_sign(pq_signature_t *signature, const uint8_t *message,
            size_t message_len, const uint8_t *secret_key);

/**
 * Verify Dilithium signature
 *
 * @param signature Signature to verify
 * @param message Original message
 * @param message_len Message length
 * @param public_key Public key for verification
 * @return true if signature valid, false otherwise
 */
bool pq_verify(const pq_signature_t *signature, const uint8_t *message,
               size_t message_len, const uint8_t *public_key);

/**
 * Sign firmware update with post-quantum signature
 *
 * @param signature Output signature
 * @param firmware Firmware binary
 * @param firmware_len Firmware length
 * @param secret_key Secret key for signing
 * @return 0 on success, -1 on failure
 */
int pq_sign_firmware(pq_signature_t *signature, const uint8_t *firmware,
                     size_t firmware_len, const uint8_t *secret_key);

/**
 * Verify firmware update signature
 *
 * @param signature Signature to verify
 * @param firmware Firmware binary
 * @param firmware_len Firmware length
 * @param public_key Public key for verification
 * @return true if signature valid, false otherwise
 */
bool pq_verify_firmware(const pq_signature_t *signature,
                        const uint8_t *firmware, size_t firmware_len,
                        const uint8_t *public_key);

/**
 * Export public key to file
 *
 * @param public_key Public key to export
 * @param filename Output filename
 * @return 0 on success, -1 on failure
 */
int pq_export_public_key(const uint8_t *public_key, const char *filename);

/**
 * Import public key from file
 *
 * @param public_key Output public key
 * @param filename Input filename
 * @return 0 on success, -1 on failure
 */
int pq_import_public_key(uint8_t *public_key, const char *filename);

#endif // PQ_CRYPTO_H

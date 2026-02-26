#pragma once

#include "config_loader.h"
#include <stddef.h>
#include <stdint.h>

// Modern encryption using libsodium (ChaCha20-Poly1305)

// Encrypt data
result_t crypto_encrypt(const uint8_t *plaintext, size_t plaintext_len,
                       const uint8_t *key, uint8_t **ciphertext, size_t *ciphertext_len);

// Decrypt data
result_t crypto_decrypt(const uint8_t *ciphertext, size_t ciphertext_len,
                       const uint8_t *key, uint8_t **plaintext, size_t *plaintext_len);

// Generate encryption key
void crypto_generate_key(uint8_t *key, size_t key_len);

// Hash data (BLAKE2b)
// Renamed to avoid clash with libsodium's crypto_hash() symbol
void mirai_crypto_hash(const uint8_t *data, size_t data_len, uint8_t *hash, size_t hash_len);

// Initialize crypto library
result_t crypto_init(void);

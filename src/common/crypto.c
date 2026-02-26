#define _GNU_SOURCE
#include "crypto.h"
#include "logger.h"
#include "util.h"

#include <sodium.h>
#include <stdlib.h>
#include <string.h>

result_t crypto_init(void) {
  if (sodium_init() < 0) {
    log_error("Failed to initialize libsodium");
    return RESULT_ERROR("Crypto initialization failed", 100);
  }
  log_debug("Crypto library initialized");
  return RESULT_OK;
}

result_t crypto_encrypt(const uint8_t *plaintext, size_t plaintext_len,
                        const uint8_t *key, uint8_t **ciphertext,
                        size_t *ciphertext_len) {
  if (!plaintext || !key || !ciphertext || !ciphertext_len) {
    return RESULT_ERROR("Invalid parameters", 101);
  }

  // Allocate buffer for nonce + ciphertext + tag
  size_t total_len = crypto_aead_chacha20poly1305_IETF_NPUBBYTES +
                     plaintext_len + crypto_aead_chacha20poly1305_IETF_ABYTES;

  *ciphertext = util_malloc(total_len);
  *ciphertext_len = total_len;

  // Generate random nonce
  uint8_t *nonce = *ciphertext;
  randombytes_buf(nonce, crypto_aead_chacha20poly1305_IETF_NPUBBYTES);

  // Encrypt
  unsigned long long ciphertext_only_len;
  if (crypto_aead_chacha20poly1305_ietf_encrypt(
          *ciphertext + crypto_aead_chacha20poly1305_IETF_NPUBBYTES,
          &ciphertext_only_len, plaintext, plaintext_len, NULL, 0, NULL, nonce,
          key) != 0) {
    util_free(*ciphertext);
    return RESULT_ERROR("Encryption failed", 102);
  }

  return RESULT_OK;
}

result_t crypto_decrypt(const uint8_t *ciphertext, size_t ciphertext_len,
                        const uint8_t *key, uint8_t **plaintext,
                        size_t *plaintext_len) {
  if (!ciphertext || !key || !plaintext || !plaintext_len) {
    return RESULT_ERROR("Invalid parameters", 103);
  }

  size_t min_len = crypto_aead_chacha20poly1305_IETF_NPUBBYTES +
                   crypto_aead_chacha20poly1305_IETF_ABYTES;

  if (ciphertext_len < min_len) {
    return RESULT_ERROR("Ciphertext too short", 104);
  }

  // Extract nonce
  const uint8_t *nonce = ciphertext;
  const uint8_t *encrypted_data =
      ciphertext + crypto_aead_chacha20poly1305_IETF_NPUBBYTES;
  size_t encrypted_len =
      ciphertext_len - crypto_aead_chacha20poly1305_IETF_NPUBBYTES;

  // Allocate plaintext buffer
  *plaintext_len = encrypted_len - crypto_aead_chacha20poly1305_IETF_ABYTES;
  *plaintext = util_malloc(*plaintext_len);

  // Decrypt
  unsigned long long plaintext_actual_len;
  if (crypto_aead_chacha20poly1305_ietf_decrypt(
          *plaintext, &plaintext_actual_len, NULL, encrypted_data,
          encrypted_len, NULL, 0, nonce, key) != 0) {
    util_free(*plaintext);
    return RESULT_ERROR("Decryption failed (authentication failed)", 105);
  }

  *plaintext_len = plaintext_actual_len;
  return RESULT_OK;
}

void crypto_generate_key(uint8_t *key, size_t key_len) {
  randombytes_buf(key, key_len);
}

void mirai_crypto_hash(const uint8_t *data, size_t data_len, uint8_t *hash,
                       size_t hash_len) {
  crypto_generichash(hash, hash_len, data, data_len, NULL, 0);
}

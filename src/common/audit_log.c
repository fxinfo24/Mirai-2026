/**
 * Audit Logging Implementation - Mirai 2026
 */

#include "audit_log.h"
#include "logger.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <json-c/json.h>

static FILE *audit_file = NULL;
static char researcher_id[256] = {0};
static char project_id[256] = {0};

static const char *audit_event_name(audit_event_t event) {
    switch (event) {
        case AUDIT_STARTUP: return "STARTUP";
        case AUDIT_SHUTDOWN: return "SHUTDOWN";
        case AUDIT_AUTH_SUCCESS: return "AUTH_SUCCESS";
        case AUDIT_AUTH_FAILURE: return "AUTH_FAILURE";
        case AUDIT_SCAN_START: return "SCAN_START";
        case AUDIT_SCAN_STOP: return "SCAN_STOP";
        case AUDIT_DEVICE_FOUND: return "DEVICE_FOUND";
        case AUDIT_CREDENTIAL_ATTEMPT: return "CREDENTIAL_ATTEMPT";
        case AUDIT_DEVICE_COMPROMISED: return "DEVICE_COMPROMISED";
        case AUDIT_ATTACK_LAUNCHED: return "ATTACK_LAUNCHED";
        case AUDIT_KILL_SWITCH_ACTIVATED: return "KILL_SWITCH_ACTIVATED";
        case AUDIT_HONEYPOT_DEPLOYED: return "HONEYPOT_DEPLOYED";
        case AUDIT_HONEYPOT_STOPPED: return "HONEYPOT_STOPPED";
        case AUDIT_DATA_COLLECTED: return "DATA_COLLECTED";
        case AUDIT_NETWORK_VIOLATION: return "NETWORK_VIOLATION";
        case AUDIT_OPERATION_DENIED: return "OPERATION_DENIED";
        default: return "UNKNOWN";
    }
}

int audit_log_init(const char *log_path, const char *researcher, const char *project) {
    if (!log_path) {
        log_path = "/var/log/mirai2026/audit.log";
    }

    // Open in append mode (tamper-evident)
    audit_file = fopen(log_path, "a");
    if (!audit_file) {
        log_error("Failed to open audit log: %s", log_path);
        return -1;
    }

    // Set unbuffered for immediate writes
    setbuf(audit_file, NULL);

    if (researcher) {
        strncpy(researcher_id, researcher, sizeof(researcher_id) - 1);
    }
    if (project) {
        strncpy(project_id, project, sizeof(project_id) - 1);
    }

    log_info("Audit logging initialized: %s", log_path);
    
    // Log initialization
    audit_log(AUDIT_STARTUP, "Audit logging system initialized");
    
    return 0;
}

void audit_log_with_target(audit_event_t event, const char *target, const char *details) {
    if (!audit_file) {
        return;
    }

    // Get timestamp
    time_t now = time(NULL);
    struct tm *tm_info = gmtime(&now);
    char timestamp[64];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", tm_info);

    // Create JSON object
    json_object *jobj = json_object_new_object();
    json_object_object_add(jobj, "timestamp", json_object_new_string(timestamp));
    json_object_object_add(jobj, "event", json_object_new_string(audit_event_name(event)));
    
    if (strlen(researcher_id) > 0) {
        json_object_object_add(jobj, "researcher_id", json_object_new_string(researcher_id));
    }
    if (strlen(project_id) > 0) {
        json_object_object_add(jobj, "project_id", json_object_new_string(project_id));
    }
    
    if (target) {
        json_object_object_add(jobj, "target", json_object_new_string(target));
    }
    
    if (details) {
        json_object_object_add(jobj, "details", json_object_new_string(details));
    }
    
    json_object_object_add(jobj, "pid", json_object_new_int(getpid()));
    
    char hostname[256];
    gethostname(hostname, sizeof(hostname));
    json_object_object_add(jobj, "hostname", json_object_new_string(hostname));

    // Write to file
    const char *json_str = json_object_to_json_string_ext(jobj, JSON_C_TO_STRING_PLAIN);
    fprintf(audit_file, "%s\n", json_str);
    
    // Also log to syslog for redundancy
    log_info("AUDIT: %s - %s", audit_event_name(event), details ? details : "");
    
    json_object_put(jobj);
}

void audit_log(audit_event_t event, const char *details) {
    audit_log_with_target(event, NULL, details);
}

void audit_log_token(const char *token) {
    if (!audit_file || !token) {
        return;
    }

    json_object *jobj = json_object_new_object();
    
    time_t now = time(NULL);
    struct tm *tm_info = gmtime(&now);
    char timestamp[64];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", tm_info);
    
    json_object_object_add(jobj, "timestamp", json_object_new_string(timestamp));
    json_object_object_add(jobj, "event", json_object_new_string("AUTHORIZATION_TOKEN"));
    json_object_object_add(jobj, "token", json_object_new_string(token));
    json_object_object_add(jobj, "researcher_id", json_object_new_string(researcher_id));
    json_object_object_add(jobj, "project_id", json_object_new_string(project_id));
    
    const char *json_str = json_object_to_json_string_ext(jobj, JSON_C_TO_STRING_PLAIN);
    fprintf(audit_file, "%s\n", json_str);
    
    json_object_put(jobj);
}

void audit_log_close(void) {
    if (audit_file) {
        audit_log(AUDIT_SHUTDOWN, "Audit logging system closed");
        fclose(audit_file);
        audit_file = NULL;
    }
}

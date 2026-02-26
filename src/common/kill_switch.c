#define _GNU_SOURCE
/**
 * Kill Switch Implementation - Mirai 2026
 */

#include "kill_switch.h"
#include "logger.h"
#include <curl/curl.h>
#include <signal.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

void kill_switch_install_signal_handler(void); // forward declaration

// Global kill switch for signal handler
static kill_switch_status_t *g_kill_switch_status = NULL;

/**
 * CURL write callback (discard response body)
 * Named with ks_ prefix to avoid collision with ai_bridge.c's callback.
 */
static size_t ks_curl_write_callback(void *contents, size_t size, size_t nmemb,
                                     void *userp) {
  (void)contents;
  (void)userp;
  return size * nmemb;
}

kill_switch_t *kill_switch_init(const char *url, int interval) {
  if (!url || interval <= 0) {
    log_error("Invalid kill switch parameters");
    return NULL;
  }

  kill_switch_t *ks = calloc(1, sizeof(kill_switch_t));
  if (!ks) {
    log_error("Failed to allocate kill switch");
    return NULL;
  }

  ks->url = strdup(url);
  ks->check_interval_seconds = interval;
  ks->enabled = true;
  ks->last_check = time(NULL);
  ks->consecutive_failures = 0;

  log_info("Kill switch initialized: url=%s, interval=%d", url, interval);
  return ks;
}

bool kill_switch_check(kill_switch_t *ks) {
  if (!ks || !ks->enabled) {
    return false;
  }

  time_t now = time(NULL);
  if ((now - ks->last_check) < ks->check_interval_seconds) {
    return false; // Not time to check yet
  }

  ks->last_check = now;

  CURL *curl = curl_easy_init();
  if (!curl) {
    log_error("Failed to initialize CURL for kill switch");
    ks->consecutive_failures++;
    return ks->consecutive_failures >= 3;
  }

  curl_easy_setopt(curl, CURLOPT_URL, ks->url);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, ks_curl_write_callback);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
  curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);

  CURLcode res = curl_easy_perform(curl);
  long http_code = 0;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
  curl_easy_cleanup(curl);

  if (res != CURLE_OK) {
    log_warn("Kill switch check failed: %s", curl_easy_strerror(res));
    ks->consecutive_failures++;

    if (ks->consecutive_failures >= 3) {
      log_error("Kill switch unreachable for 3 consecutive checks - "
                "terminating for safety");
      return true;
    }
    return false;
  }

  ks->consecutive_failures = 0;

  if (http_code != 200) {
    log_warn("Kill switch activated: HTTP %ld", http_code);
    return true; // Terminate
  }

  log_debug("Kill switch check OK: HTTP %ld", http_code);
  return false; // Safe to continue
}

time_limit_t *time_limit_init(time_t max_runtime_seconds) {
  if (max_runtime_seconds <= 0) {
    log_error("Invalid time limit: %ld", max_runtime_seconds);
    return NULL;
  }

  time_limit_t *tl = calloc(1, sizeof(time_limit_t));
  if (!tl) {
    log_error("Failed to allocate time limit");
    return NULL;
  }

  tl->start_time = time(NULL);
  tl->max_runtime_seconds = max_runtime_seconds;
  tl->enabled = true;

  log_info("Time limit initialized: %ld seconds (%.1f hours)",
           max_runtime_seconds, max_runtime_seconds / 3600.0);
  return tl;
}

bool time_limit_exceeded(time_limit_t *tl) {
  if (!tl || !tl->enabled) {
    return false;
  }

  time_t now = time(NULL);
  time_t elapsed = now - tl->start_time;

  if (elapsed > tl->max_runtime_seconds) {
    log_warn("Time limit exceeded: %ld seconds (max: %ld)", elapsed,
             tl->max_runtime_seconds);
    return true;
  }

  // Warn at 90% runtime
  if (elapsed > (tl->max_runtime_seconds * 0.9)) {
    time_t remaining = tl->max_runtime_seconds - elapsed;
    log_warn("Approaching time limit: %ld seconds remaining", remaining);
  }

  return false;
}

kill_switch_status_t *kill_switch_system_init(const char *remote_url,
                                              time_t max_runtime) {
  kill_switch_status_t *status = calloc(1, sizeof(kill_switch_status_t));
  if (!status) {
    log_error("Failed to allocate kill switch system");
    return NULL;
  }

  // Initialize remote kill switch
  if (remote_url) {
    status->remote = kill_switch_init(remote_url, 60);
    if (!status->remote) {
      log_warn("Remote kill switch initialization failed");
    }
  }

  // Initialize time limit
  if (max_runtime > 0) {
    status->time_limit = time_limit_init(max_runtime);
    if (!status->time_limit) {
      log_warn("Time limit initialization failed");
    }
  }

  status->manual_triggered = false;
  status->reason = NULL;

  // Set global for signal handler
  g_kill_switch_status = status;

  log_info("Kill switch system initialized: remote=%s, time_limit=%ld",
           remote_url ? "enabled" : "disabled", max_runtime);

  return status;
}

bool kill_switch_should_terminate(kill_switch_status_t *status) {
  if (!status) {
    return false;
  }

  // Check manual trigger
  if (status->manual_triggered) {
    status->reason = strdup("Manual kill switch activated");
    return true;
  }

  // Check remote kill switch
  if (status->remote && kill_switch_check(status->remote)) {
    status->reason = strdup("Remote kill switch activated");
    return true;
  }

  // Check time limit
  if (status->time_limit && time_limit_exceeded(status->time_limit)) {
    status->reason = strdup("Time limit exceeded");
    return true;
  }

  return false;
}

const char *kill_switch_get_reason(kill_switch_status_t *status) {
  if (!status || !status->reason) {
    return "Unknown";
  }
  return status->reason;
}

void kill_switch_manual_activate(kill_switch_status_t *status) {
  if (status) {
    status->manual_triggered = true;
    log_warn("Manual kill switch activated");
  }
}

/**
 * Signal handler for SIGUSR1 (manual kill switch)
 */
static void kill_switch_signal_handler(int signum) {
  if (signum == SIGUSR1 && g_kill_switch_status) {
    kill_switch_manual_activate(g_kill_switch_status);
  }
}

/**
 * Install signal handler for manual kill switch
 * Call this during initialization
 */
void kill_switch_install_signal_handler(void) {
  signal(SIGUSR1, kill_switch_signal_handler);
  log_info("Manual kill switch installed: kill -USR1 %d", (int)getpid());
}

void kill_switch_destroy(kill_switch_t *ks) {
  if (ks) {
    free(ks->url);
    free(ks);
  }
}

void time_limit_destroy(time_limit_t *tl) {
  if (tl) {
    free(tl);
  }
}

void kill_switch_system_destroy(kill_switch_status_t *status) {
  if (status) {
    kill_switch_destroy(status->remote);
    time_limit_destroy(status->time_limit);
    free(status->reason);
    free(status);
  }
  g_kill_switch_status = NULL;
}

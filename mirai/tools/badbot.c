/*
 * badbot.c - Mirai 2026 Bot Simulator Tool
 * 
 * Test tool that simulates a bot connecting to a C&C server.
 * Intended for authorized security research only.
 * 
 * Usage: badbot [C&C_ADDRESS:PORT]
 *        Default: 127.0.0.1:80
 * 
 * Environment variables:
 *   BADBOT_INTERVAL      - Report interval in seconds (default: 1)
 *   BADBOT_REQUIRE_AUTH  - If set to 1, requires BADBOT_AUTH_TOKEN
 *   BADBOT_AUTH_TOKEN    - Authentication token (required if BADBOT_REQUIRE_AUTH=1)
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <signal.h>
#include <string.h>
#include <time.h>

/* Global flag for clean shutdown */
static volatile sig_atomic_t shutdown_flag = 0;

/* Signal handler for SIGTERM and SIGINT */
static void signal_handler(int sig)
{
    shutdown_flag = 1;
}

/* Audit log with timestamp */
static void audit_log(const char *event, const char *details)
{
    time_t now = time(NULL);
    struct tm *timeinfo = localtime(&now);
    char timestamp[32];
    
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", timeinfo);
    fprintf(stderr, "[%s] %s: %s\n", timestamp, event, details);
}

/* Parse C&C address from string format "host:port" */
static int parse_ccnc_address(const char *input, char *host, char *port)
{
    const char *colon = strchr(input, ':');
    if (colon == NULL)
        return -1;
    
    size_t host_len = colon - input;
    if (host_len == 0 || host_len >= 256)
        return -1;
    
    strncpy(host, input, host_len);
    host[host_len] = '\0';
    strncpy(port, colon + 1, 16);
    port[15] = '\0';
    
    return 0;
}

int main(int argc, char **argv)
{
#ifdef RESEARCH_MODE
    fprintf(stdout, "==================================================\n");
    fprintf(stdout, "Mirai 2026 Research Tool - Authorized Use Only\n");
    fprintf(stdout, "==================================================\n\n");
#endif

    /* Default values */
    char ccnc_host[256] = "127.0.0.1";
    char ccnc_port[16] = "80";
    int report_interval = 1;
    int require_auth = 0;
    const char *auth_token = NULL;
    const char *provided_token = NULL;
    
    /* Parse command-line arguments */
    if (argc > 1)
    {
        if (parse_ccnc_address(argv[1], ccnc_host, ccnc_port) != 0)
        {
            fprintf(stderr, "ERROR: Invalid C&C address format. Use HOST:PORT\n");
            return 1;
        }
    }
    
    /* Check environment variables */
    const char *interval_env = getenv("BADBOT_INTERVAL");
    if (interval_env != NULL)
    {
        report_interval = atoi(interval_env);
        if (report_interval < 1)
            report_interval = 1;
    }
    
    const char *require_auth_env = getenv("BADBOT_REQUIRE_AUTH");
    if (require_auth_env != NULL && strcmp(require_auth_env, "1") == 0)
    {
        require_auth = 1;
    }
    
    if (require_auth)
    {
        auth_token = getenv("BADBOT_AUTH_TOKEN");
        if (auth_token == NULL)
        {
            audit_log("BADBOT_AUTH_FAIL", "BADBOT_REQUIRE_AUTH=1 but BADBOT_AUTH_TOKEN not set");
            fprintf(stderr, "ERROR: BADBOT_REQUIRE_AUTH=1 requires BADBOT_AUTH_TOKEN env var\n");
            return 1;
        }
    }
    
    /* Register signal handlers for clean shutdown */
    signal(SIGTERM, signal_handler);
    signal(SIGINT, signal_handler);
    
    char details[256];
    snprintf(details, sizeof(details), "Connecting to %s:%s (interval=%ds)", 
             ccnc_host, ccnc_port, report_interval);
    audit_log("BADBOT_START", details);
    
    /* Main loop: report to C&C at specified interval */
    while (!shutdown_flag)
    {
        snprintf(details, sizeof(details), "%s:%s", ccnc_host, ccnc_port);
        printf("REPORT %s:%s\n", ccnc_host, ccnc_port);
        audit_log("BADBOT_REPORT", details);
        
        sleep(report_interval);
    }
    
    audit_log("BADBOT_STOP", "Shutdown signal received");
    return 0;
}

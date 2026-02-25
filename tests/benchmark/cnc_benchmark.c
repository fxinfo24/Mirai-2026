/**
 * CNC Scalability Benchmark - Mirai 2026
 * 
 * Purpose: Measure C&C server performance against success metrics
 * 
 * Success Criteria:
 * - 100k+ concurrent bot connections
 * - <5% CPU usage with 100k bots
 * - <1GB memory usage
 * 
 * Usage:
 *   ./cnc_benchmark --target-bots 100000 --ramp-up 60 --duration 300
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <pthread.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <sys/resource.h>
#include <sys/time.h>

#define MAX_BOT_THREADS 100
#define BOTS_PER_THREAD 1000
#define HEARTBEAT_INTERVAL 30

typedef struct {
    uint64_t bots_connected;
    uint64_t bots_active;
    uint64_t heartbeats_sent;
    uint64_t commands_received;
    uint64_t bytes_sent;
    uint64_t bytes_received;
    double start_time;
    double end_time;
    double cpu_start;
    double cpu_end;
    size_t memory_start;
    size_t memory_end;
} cnc_stats_t;

typedef struct {
    int thread_id;
    int bots_count;
    char *cnc_host;
    int cnc_port;
    int ramp_up_seconds;
    cnc_stats_t *stats;
    volatile int *running;
} bot_thread_args_t;

static volatile int g_running = 1;

/**
 * Get current time
 */
static double get_time_seconds(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec + ts.tv_nsec / 1000000000.0;
}

/**
 * Get CPU time
 */
static double get_cpu_time(void) {
    struct rusage usage;
    getrusage(RUSAGE_SELF, &usage);
    return usage.ru_utime.tv_sec + usage.ru_utime.tv_usec / 1000000.0 +
           usage.ru_stime.tv_sec + usage.ru_stime.tv_usec / 1000000.0;
}

/**
 * Get memory usage in bytes
 */
static size_t get_memory_usage(void) {
    FILE *fp = fopen("/proc/self/statm", "r");
    if (!fp) return 0;
    
    size_t size, resident, share, text, lib, data, dt;
    fscanf(fp, "%zu %zu %zu %zu %zu %zu %zu", 
           &size, &resident, &share, &text, &lib, &data, &dt);
    fclose(fp);
    
    // Return RSS in bytes (resident * page_size)
    return resident * sysconf(_SC_PAGESIZE);
}

/**
 * Set socket to non-blocking
 */
static int set_nonblocking(int fd) {
    int flags = fcntl(fd, F_GETFL, 0);
    if (flags == -1) return -1;
    return fcntl(fd, F_SETFL, flags | O_NONBLOCK);
}

/**
 * Signal handler
 */
static void signal_handler(int signum) {
    (void)signum;
    g_running = 0;
}

/**
 * Simulate bot behavior
 */
static void *bot_thread(void *arg) {
    bot_thread_args_t *args = (bot_thread_args_t *)arg;
    
    int *sockets = calloc(args->bots_count, sizeof(int));
    if (!sockets) {
        fprintf(stderr, "Thread %d: Failed to allocate socket array\n", args->thread_id);
        return NULL;
    }
    
    // Initialize all sockets to -1
    for (int i = 0; i < args->bots_count; i++) {
        sockets[i] = -1;
    }
    
    double thread_start = get_time_seconds();
    int connected_count = 0;
    
    // Ramp up connections gradually
    double ramp_interval = (double)args->ramp_up_seconds / args->bots_count;
    
    printf("[Thread %d] Starting %d bots (ramp-up: %.3fs per bot)\n",
           args->thread_id, args->bots_count, ramp_interval);
    
    for (int i = 0; i < args->bots_count && *args->running; i++) {
        // Create socket
        int sock = socket(AF_INET, SOCK_STREAM, 0);
        if (sock < 0) {
            if (i % 100 == 0) {
                perror("socket");
            }
            continue;
        }
        
        set_nonblocking(sock);
        
        // Connect to C&C
        struct sockaddr_in addr;
        memset(&addr, 0, sizeof(addr));
        addr.sin_family = AF_INET;
        addr.sin_port = htons(args->cnc_port);
        inet_pton(AF_INET, args->cnc_host, &addr.sin_addr);
        
        int ret = connect(sock, (struct sockaddr *)&addr, sizeof(addr));
        if (ret < 0 && errno != EINPROGRESS) {
            close(sock);
            continue;
        }
        
        sockets[i] = sock;
        connected_count++;
        __sync_fetch_and_add(&args->stats->bots_connected, 1);
        
        // Ramp-up delay
        if (ramp_interval > 0.001) {
            usleep((int)(ramp_interval * 1000000));
        }
        
        // Progress update
        if (i % 100 == 0) {
            double elapsed = get_time_seconds() - thread_start;
            printf("[Thread %d] Connected: %d/%d (%.0f/sec)\r",
                   args->thread_id, connected_count, args->bots_count,
                   connected_count / elapsed);
            fflush(stdout);
        }
    }
    
    printf("\n[Thread %d] Ramp-up complete: %d bots connected\n",
           args->thread_id, connected_count);
    
    __sync_fetch_and_add(&args->stats->bots_active, connected_count);
    
    // Keep connections alive and send heartbeats
    double last_heartbeat = get_time_seconds();
    
    while (*args->running) {
        double now = get_time_seconds();
        
        // Send heartbeats periodically
        if (now - last_heartbeat >= HEARTBEAT_INTERVAL) {
            for (int i = 0; i < args->bots_count; i++) {
                if (sockets[i] >= 0) {
                    char heartbeat[] = "PING\n";
                    ssize_t sent = send(sockets[i], heartbeat, strlen(heartbeat), MSG_DONTWAIT);
                    if (sent > 0) {
                        __sync_fetch_and_add(&args->stats->heartbeats_sent, 1);
                        __sync_fetch_and_add(&args->stats->bytes_sent, sent);
                    } else if (sent < 0 && errno != EAGAIN && errno != EWOULDBLOCK) {
                        // Connection lost
                        close(sockets[i]);
                        sockets[i] = -1;
                        __sync_fetch_and_sub(&args->stats->bots_active, 1);
                    }
                }
            }
            last_heartbeat = now;
        }
        
        // Check for incoming commands
        for (int i = 0; i < args->bots_count; i++) {
            if (sockets[i] >= 0) {
                char buffer[1024];
                ssize_t received = recv(sockets[i], buffer, sizeof(buffer), MSG_DONTWAIT);
                if (received > 0) {
                    __sync_fetch_and_add(&args->stats->commands_received, 1);
                    __sync_fetch_and_add(&args->stats->bytes_received, received);
                } else if (received == 0) {
                    // Connection closed by server
                    close(sockets[i]);
                    sockets[i] = -1;
                    __sync_fetch_and_sub(&args->stats->bots_active, 1);
                }
            }
        }
        
        // Sleep briefly to avoid tight loop
        usleep(100000); // 100ms
    }
    
    // Cleanup
    for (int i = 0; i < args->bots_count; i++) {
        if (sockets[i] >= 0) {
            close(sockets[i]);
        }
    }
    
    free(sockets);
    
    printf("[Thread %d] Shutting down\n", args->thread_id);
    return NULL;
}

/**
 * Run C&C benchmark
 */
static void run_benchmark(int target_bots, int ramp_up, int duration, char *cnc_host, int cnc_port) {
    printf("========================================\n");
    printf("C&C Scalability Benchmark\n");
    printf("========================================\n");
    printf("Target bots:          %d\n", target_bots);
    printf("Ramp-up time:         %d seconds\n", ramp_up);
    printf("Test duration:        %d seconds\n", duration);
    printf("C&C server:           %s:%d\n", cnc_host, cnc_port);
    printf("========================================\n\n");
    
    // Calculate threads needed
    int num_threads = (target_bots + BOTS_PER_THREAD - 1) / BOTS_PER_THREAD;
    if (num_threads > MAX_BOT_THREADS) {
        num_threads = MAX_BOT_THREADS;
    }
    
    int bots_per_thread = target_bots / num_threads;
    
    printf("Bot threads:          %d\n", num_threads);
    printf("Bots per thread:      %d\n\n", bots_per_thread);
    
    pthread_t threads[MAX_BOT_THREADS];
    bot_thread_args_t thread_args[MAX_BOT_THREADS];
    cnc_stats_t stats = {0};
    
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    stats.start_time = get_time_seconds();
    stats.cpu_start = get_cpu_time();
    stats.memory_start = get_memory_usage();
    
    // Create bot threads
    for (int i = 0; i < num_threads; i++) {
        thread_args[i].thread_id = i;
        thread_args[i].bots_count = bots_per_thread;
        thread_args[i].cnc_host = cnc_host;
        thread_args[i].cnc_port = cnc_port;
        thread_args[i].ramp_up_seconds = ramp_up / num_threads;
        thread_args[i].stats = &stats;
        thread_args[i].running = &g_running;
        
        if (pthread_create(&threads[i], NULL, bot_thread, &thread_args[i]) != 0) {
            fprintf(stderr, "Failed to create thread %d\n", i);
            exit(1);
        }
        
        // Stagger thread starts
        usleep(100000); // 100ms
    }
    
    // Monitor progress
    double start = get_time_seconds();
    while (g_running && (get_time_seconds() - start) < (ramp_up + duration)) {
        sleep(5);
        
        double elapsed = get_time_seconds() - stats.start_time;
        double cpu_time = get_cpu_time() - stats.cpu_start;
        double cpu_percent = (cpu_time / elapsed) * 100.0;
        size_t memory = get_memory_usage();
        double memory_mb = memory / (1024.0 * 1024.0);
        
        printf("\n[Status] Time: %.0fs | Bots: %lu/%d | Active: %lu | CPU: %.1f%% | Mem: %.0f MB\n",
               elapsed, stats.bots_connected, target_bots, stats.bots_active,
               cpu_percent, memory_mb);
    }
    
    printf("\n\nShutting down...\n");
    g_running = 0;
    
    // Wait for threads
    for (int i = 0; i < num_threads; i++) {
        pthread_join(threads[i], NULL);
    }
    
    stats.end_time = get_time_seconds();
    stats.cpu_end = get_cpu_time();
    stats.memory_end = get_memory_usage();
    
    // Calculate metrics
    double total_time = stats.end_time - stats.start_time;
    double cpu_time = stats.cpu_end - stats.cpu_start;
    double cpu_percent = (cpu_time / total_time) * 100.0;
    double memory_mb = stats.memory_end / (1024.0 * 1024.0);
    
    // Print results
    printf("\n========================================\n");
    printf("Benchmark Results\n");
    printf("========================================\n");
    printf("Bots connected:       %lu\n", stats.bots_connected);
    printf("Bots active:          %lu\n", stats.bots_active);
    printf("Heartbeats sent:      %lu\n", stats.heartbeats_sent);
    printf("Commands received:    %lu\n", stats.commands_received);
    printf("Duration:             %.2f seconds\n", total_time);
    printf("\n");
    printf("CPU usage:            %.2f%%\n", cpu_percent);
    printf("Memory usage:         %.0f MB\n", memory_mb);
    printf("Bytes sent:           %lu\n", stats.bytes_sent);
    printf("Bytes received:       %lu\n", stats.bytes_received);
    printf("\n");
    
    // Success criteria
    printf("========================================\n");
    printf("Success Criteria\n");
    printf("========================================\n");
    
    printf("Concurrent bots:      ");
    if (stats.bots_connected >= 100000) {
        printf("✓ PASS (%lu >= 100,000)\n", stats.bots_connected);
    } else {
        printf("✗ FAIL (%lu < 100,000)\n", stats.bots_connected);
    }
    
    printf("CPU usage:            ");
    if (cpu_percent < 5.0) {
        printf("✓ PASS (%.2f%% < 5%%)\n", cpu_percent);
    } else {
        printf("✗ FAIL (%.2f%% >= 5%%)\n", cpu_percent);
    }
    
    printf("Memory usage:         ");
    if (memory_mb < 1024.0) {
        printf("✓ PASS (%.0f MB < 1024 MB)\n", memory_mb);
    } else {
        printf("✗ FAIL (%.0f MB >= 1024 MB)\n", memory_mb);
    }
    
    printf("========================================\n");
}

int main(int argc, char *argv[]) {
    int target_bots = 100000;
    int ramp_up = 60;
    int duration = 300;
    char *cnc_host = "127.0.0.1";
    int cnc_port = 23;
    
    // Parse arguments
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--target-bots") == 0 && i + 1 < argc) {
            target_bots = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--ramp-up") == 0 && i + 1 < argc) {
            ramp_up = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--duration") == 0 && i + 1 < argc) {
            duration = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--host") == 0 && i + 1 < argc) {
            cnc_host = argv[++i];
        } else if (strcmp(argv[i], "--port") == 0 && i + 1 < argc) {
            cnc_port = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--help") == 0) {
            printf("Usage: %s [options]\n", argv[0]);
            printf("Options:\n");
            printf("  --target-bots <n>   Target bots (default: 100000)\n");
            printf("  --ramp-up <sec>     Ramp-up time (default: 60)\n");
            printf("  --duration <sec>    Test duration (default: 300)\n");
            printf("  --host <ip>         C&C host (default: 127.0.0.1)\n");
            printf("  --port <port>       C&C port (default: 23)\n");
            printf("  --help              Show this help\n");
            return 0;
        }
    }
    
    printf("Note: Ensure ulimit -n is set high (e.g., ulimit -n 200000)\n");
    printf("Note: C&C server must be running at %s:%d\n\n", cnc_host, cnc_port);
    
    run_benchmark(target_bots, ramp_up, duration, cnc_host, cnc_port);
    
    return 0;
}

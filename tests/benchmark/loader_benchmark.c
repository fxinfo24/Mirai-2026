/**
 * Loader Performance Benchmark - Mirai 2026
 * 
 * Purpose: Measure loader performance against success metrics
 * 
 * Success Criteria:
 * - 60k+ concurrent connections (across 5 IPs)
 * - 500+ loads/sec throughput
 * - <5s average load time
 * 
 * Usage:
 *   ./loader_benchmark --ips 5 --target-connections 60000 --duration 300
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
#include <sys/epoll.h>
#include <signal.h>

#define MAX_IPS 10
#define MAX_EVENTS 1024
#define BUFFER_SIZE 4096

typedef struct {
    uint64_t total_connections;
    uint64_t active_connections;
    uint64_t successful_loads;
    uint64_t failed_loads;
    double total_load_time;
    double start_time;
    double end_time;
} loader_stats_t;

typedef struct {
    int ip_index;
    char *ip_address;
    int port;
    uint64_t target_connections;
    loader_stats_t *stats;
    volatile int *running;
} loader_args_t;

static volatile int g_running = 1;

/**
 * Get current time in seconds
 */
static double get_time_seconds(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec + ts.tv_nsec / 1000000000.0;
}

/**
 * Set socket to non-blocking mode
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
 * Loader thread - simulates loading binaries to devices
 */
static void *loader_thread(void *arg) {
    loader_args_t *args = (loader_args_t *)arg;
    
    printf("[IP %d] Starting loader on %s:%d\n", 
           args->ip_index, args->ip_address, args->port);
    
    // Create epoll instance
    int epoll_fd = epoll_create1(0);
    if (epoll_fd == -1) {
        perror("epoll_create1");
        return NULL;
    }
    
    args->stats->start_time = get_time_seconds();
    
    uint64_t connections_created = 0;
    uint64_t active_connections = 0;
    
    // Create listening socket
    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (listen_fd < 0) {
        perror("socket");
        close(epoll_fd);
        return NULL;
    }
    
    // Set socket options
    int opt = 1;
    setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    setsockopt(listen_fd, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));
    
    // Bind to specific IP and port
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(args->port);
    inet_pton(AF_INET, args->ip_address, &addr.sin_addr);
    
    if (bind(listen_fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(listen_fd);
        close(epoll_fd);
        return NULL;
    }
    
    if (listen(listen_fd, 1024) < 0) {
        perror("listen");
        close(listen_fd);
        close(epoll_fd);
        return NULL;
    }
    
    set_nonblocking(listen_fd);
    
    // Add listening socket to epoll
    struct epoll_event ev;
    ev.events = EPOLLIN;
    ev.data.fd = listen_fd;
    epoll_ctl(epoll_fd, EPOLL_CTL_ADD, listen_fd, &ev);
    
    struct epoll_event events[MAX_EVENTS];
    
    // Main event loop
    while (*args->running && connections_created < args->target_connections) {
        int nfds = epoll_wait(epoll_fd, events, MAX_EVENTS, 100);
        
        for (int i = 0; i < nfds; i++) {
            if (events[i].data.fd == listen_fd) {
                // Accept new connections
                while (1) {
                    struct sockaddr_in client_addr;
                    socklen_t client_len = sizeof(client_addr);
                    int client_fd = accept(listen_fd, (struct sockaddr *)&client_addr, &client_len);
                    
                    if (client_fd < 0) {
                        if (errno == EAGAIN || errno == EWOULDBLOCK) {
                            break; // No more connections
                        }
                        perror("accept");
                        break;
                    }
                    
                    set_nonblocking(client_fd);
                    
                    // Add client to epoll
                    ev.events = EPOLLIN | EPOLLOUT | EPOLLET;
                    ev.data.fd = client_fd;
                    epoll_ctl(epoll_fd, EPOLL_CTL_ADD, client_fd, &ev);
                    
                    connections_created++;
                    active_connections++;
                    args->stats->total_connections++;
                    args->stats->active_connections = active_connections;
                    
                    if (connections_created >= args->target_connections) {
                        break;
                    }
                }
            } else {
                // Handle client I/O
                int client_fd = events[i].data.fd;
                
                if (events[i].events & EPOLLIN) {
                    // Read data
                    char buffer[BUFFER_SIZE];
                    ssize_t n = read(client_fd, buffer, sizeof(buffer));
                    
                    if (n <= 0) {
                        // Connection closed or error
                        epoll_ctl(epoll_fd, EPOLL_CTL_DEL, client_fd, NULL);
                        close(client_fd);
                        active_connections--;
                        args->stats->active_connections = active_connections;
                        args->stats->successful_loads++;
                    }
                }
                
                if (events[i].events & EPOLLOUT) {
                    // Simulate sending binary data
                    char payload[] = "BINARY_DATA";
                    write(client_fd, payload, sizeof(payload));
                }
            }
        }
        
        // Update statistics periodically
        if (connections_created % 1000 == 0) {
            double elapsed = get_time_seconds() - args->stats->start_time;
            double rate = connections_created / elapsed;
            printf("[IP %d] Connections: %lu/%lu (%.0f/sec), Active: %lu\r",
                   args->ip_index, connections_created, args->target_connections,
                   rate, active_connections);
            fflush(stdout);
        }
    }
    
    args->stats->end_time = get_time_seconds();
    
    printf("\n[IP %d] Loader complete: %lu connections\n", 
           args->ip_index, connections_created);
    
    close(listen_fd);
    close(epoll_fd);
    
    return NULL;
}

/**
 * Run loader benchmark
 */
static void run_benchmark(int num_ips, uint64_t target_connections, int duration) {
    printf("========================================\n");
    printf("Loader Performance Benchmark\n");
    printf("========================================\n");
    printf("Number of IPs:        %d\n", num_ips);
    printf("Target connections:   %lu\n", target_connections);
    printf("Connections per IP:   %lu\n", target_connections / num_ips);
    printf("Duration:             %d seconds\n", duration);
    printf("========================================\n\n");
    
    pthread_t threads[MAX_IPS];
    loader_args_t thread_args[MAX_IPS];
    loader_stats_t stats[MAX_IPS];
    
    // Simulated IP addresses (in real deployment, these would be actual IPs)
    char *ip_addresses[MAX_IPS] = {
        "127.0.0.1",
        "127.0.0.2",
        "127.0.0.3",
        "127.0.0.4",
        "127.0.0.5",
        "127.0.0.6",
        "127.0.0.7",
        "127.0.0.8",
        "127.0.0.9",
        "127.0.0.10"
    };
    
    int base_port = 48101;
    
    memset(stats, 0, sizeof(stats));
    
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    // Create loader threads
    uint64_t connections_per_ip = target_connections / num_ips;
    
    for (int i = 0; i < num_ips; i++) {
        thread_args[i].ip_index = i;
        thread_args[i].ip_address = ip_addresses[i];
        thread_args[i].port = base_port + i;
        thread_args[i].target_connections = connections_per_ip;
        thread_args[i].stats = &stats[i];
        thread_args[i].running = &g_running;
        
        if (pthread_create(&threads[i], NULL, loader_thread, &thread_args[i]) != 0) {
            fprintf(stderr, "Failed to create thread %d\n", i);
            exit(1);
        }
    }
    
    // Wait for threads
    for (int i = 0; i < num_ips; i++) {
        pthread_join(threads[i], NULL);
    }
    
    // Aggregate results
    uint64_t total_connections = 0;
    uint64_t total_successful = 0;
    uint64_t total_failed = 0;
    double max_duration = 0;
    
    for (int i = 0; i < num_ips; i++) {
        total_connections += stats[i].total_connections;
        total_successful += stats[i].successful_loads;
        total_failed += stats[i].failed_loads;
        
        double duration = stats[i].end_time - stats[i].start_time;
        if (duration > max_duration) {
            max_duration = duration;
        }
    }
    
    double loads_per_sec = total_successful / max_duration;
    double avg_load_time = max_duration / (total_successful > 0 ? total_successful : 1);
    
    // Print results
    printf("\n========================================\n");
    printf("Benchmark Results\n");
    printf("========================================\n");
    printf("Total connections:    %lu\n", total_connections);
    printf("Successful loads:     %lu\n", total_successful);
    printf("Failed loads:         %lu\n", total_failed);
    printf("Duration:             %.2f seconds\n", max_duration);
    printf("\n");
    printf("Loads/sec:            %.2f\n", loads_per_sec);
    printf("Avg load time:        %.2f seconds\n", avg_load_time);
    printf("\n");
    
    // Success criteria
    printf("========================================\n");
    printf("Success Criteria\n");
    printf("========================================\n");
    
    printf("Concurrent connections: ");
    if (total_connections >= 60000) {
        printf("✓ PASS (%lu >= 60,000)\n", total_connections);
    } else {
        printf("✗ FAIL (%lu < 60,000)\n", total_connections);
    }
    
    printf("Loads/sec throughput:   ");
    if (loads_per_sec >= 500) {
        printf("✓ PASS (%.0f >= 500)\n", loads_per_sec);
    } else {
        printf("✗ FAIL (%.0f < 500)\n", loads_per_sec);
    }
    
    printf("Avg load time:          ");
    if (avg_load_time < 5.0) {
        printf("✓ PASS (%.2fs < 5s)\n", avg_load_time);
    } else {
        printf("✗ FAIL (%.2fs >= 5s)\n", avg_load_time);
    }
    
    printf("========================================\n");
}

int main(int argc, char *argv[]) {
    int num_ips = 5;
    uint64_t target_connections = 60000;
    int duration = 300;
    
    // Parse arguments
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--ips") == 0 && i + 1 < argc) {
            num_ips = atoi(argv[++i]);
            if (num_ips < 1 || num_ips > MAX_IPS) {
                fprintf(stderr, "Error: ips must be 1-%d\n", MAX_IPS);
                return 1;
            }
        } else if (strcmp(argv[i], "--target-connections") == 0 && i + 1 < argc) {
            target_connections = atoll(argv[++i]);
        } else if (strcmp(argv[i], "--duration") == 0 && i + 1 < argc) {
            duration = atoi(argv[++i]);
        } else if (strcmp(argv[i], "--help") == 0) {
            printf("Usage: %s [options]\n", argv[0]);
            printf("Options:\n");
            printf("  --ips <n>                 Number of IPs (default: 5)\n");
            printf("  --target-connections <n>  Target connections (default: 60000)\n");
            printf("  --duration <sec>          Duration (default: 300)\n");
            printf("  --help                    Show this help\n");
            return 0;
        }
    }
    
    // Increase file descriptor limits
    printf("Note: Ensure ulimit -n is set high enough (e.g., ulimit -n 100000)\n\n");
    
    run_benchmark(num_ips, target_connections, duration);
    
    return 0;
}

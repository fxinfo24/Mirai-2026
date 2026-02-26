/**
 * @file telnet_state_machine.h
 * @brief Full telnet state machine interface for IoT device scanning
 */

#ifndef TELNET_STATE_MACHINE_H
#define TELNET_STATE_MACHINE_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

/**
 * Telnet connection states (11-state machine)
 */
typedef enum {
    TELNET_STATE_CLOSED,              // Connection not active
    TELNET_STATE_CONNECTING,          // TCP connection in progress
    TELNET_STATE_HANDLE_IACS,         // Process telnet IAC negotiations
    TELNET_STATE_WAITING_USERNAME,    // Wait for username prompt
    TELNET_STATE_WAITING_PASSWORD,    // Wait for password prompt
    TELNET_STATE_WAITING_PASSWD_RESP, // Wait for shell after password
    TELNET_STATE_WAITING_ENABLE_RESP, // Wait for "enable" response
    TELNET_STATE_WAITING_SYSTEM_RESP, // Wait for "system" response
    TELNET_STATE_WAITING_SHELL_RESP,  // Wait for "shell" response
    TELNET_STATE_WAITING_SH_RESP,     // Wait for "sh" response
    TELNET_STATE_WAITING_TOKEN_RESP   // Wait for verification token
} telnet_state_t;

/**
 * Credentials for authentication
 */
typedef struct {
    const char *username;
    size_t username_len;
    const char *password;
    size_t password_len;
} telnet_credentials_t;

/**
 * Telnet connection context
 */
typedef struct {
    int fd;                    // Socket file descriptor
    telnet_state_t state;      // Current state
    uint32_t dst_addr;         // Destination IP address
    uint16_t dst_port;         // Destination port
    uint8_t tries;             // Number of credential attempts
    int rdbuf_pos;             // Current read buffer position
    char rdbuf[256];           // Read buffer for telnet data
} telnet_conn_t;

/**
 * Initialize a new telnet connection
 */
void telnet_connection_init(telnet_conn_t *conn, int fd, uint32_t dst_addr, uint16_t dst_port);

/**
 * Reset connection for retry with different credentials
 */
void telnet_connection_reset(telnet_conn_t *conn);

/**
 * Process received data based on current state
 * 
 * @param conn Connection to process
 * @param creds Credentials to use
 * @return 0 = continue, 1 = success, -1 = failed
 */
int telnet_state_machine_process(telnet_conn_t *conn, const telnet_credentials_t *creds);

/**
 * Receive data into connection buffer
 * 
 * @return Bytes received, 0 on graceful close, -1 on error
 */
ssize_t telnet_receive_data(telnet_conn_t *conn);

/**
 * Individual state handlers (exported for testing)
 */
int telnet_consume_iacs(telnet_conn_t *conn);
int telnet_consume_user_prompt(telnet_conn_t *conn);
int telnet_consume_pass_prompt(telnet_conn_t *conn);
int telnet_consume_any_prompt(telnet_conn_t *conn);
int telnet_consume_resp_prompt(telnet_conn_t *conn, 
                               const char *token, size_t token_len,
                               const char *incorrect_msg, size_t incorrect_len);

#endif // TELNET_STATE_MACHINE_H

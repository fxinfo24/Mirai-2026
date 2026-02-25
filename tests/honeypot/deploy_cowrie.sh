#!/bin/bash
# Cowrie Honeypot Deployment Script - Mirai 2026
# 
# Purpose: Deploy and test Cowrie SSH/Telnet honeypot for research
# 
# Safety: This script deploys an isolated honeypot for educational purposes only

set -e

COWRIE_DIR="${HOME}/cowrie-honeypot"
VENV_DIR="${COWRIE_DIR}/cowrie-env"
LOG_DIR="${COWRIE_DIR}/var/log/cowrie"

echo "========================================="
echo "Cowrie Honeypot Deployment - Mirai 2026"
echo "========================================="
echo

# Check if running with appropriate privileges
if [ "$EUID" -eq 0 ]; then 
   echo "WARNING: Do not run Cowrie as root!"
   echo "Create a dedicated user: sudo adduser --disabled-password cowrie"
   exit 1
fi

# Install dependencies
echo "[1/7] Installing dependencies..."
sudo apt-get update
sudo apt-get install -y \
    git \
    python3 \
    python3-venv \
    python3-pip \
    libssl-dev \
    libffi-dev \
    build-essential \
    tcpdump

# Clone Cowrie
echo "[2/7] Cloning Cowrie..."
if [ ! -d "$COWRIE_DIR" ]; then
    git clone https://github.com/cowrie/cowrie "$COWRIE_DIR"
else
    echo "Cowrie directory already exists, skipping clone"
fi

cd "$COWRIE_DIR"

# Create virtual environment
echo "[3/7] Creating Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi

source "${VENV_DIR}/bin/activate"

# Install Python dependencies
echo "[4/7] Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# Configure Cowrie
echo "[5/7] Configuring Cowrie..."
if [ ! -f etc/cowrie.cfg ]; then
    cp etc/cowrie.cfg.dist etc/cowrie.cfg
    
    # Customize configuration for Mirai research
    cat > etc/cowrie.cfg << 'EOF'
[honeypot]
hostname = mirai-research-honeypot
arch = armv7l
kernel_version = 4.9.0
kernel_build_string = #1 SMP PREEMPT Tue Jan 1 00:00:00 UTC 2020
ssh_version_string = SSH-2.0-OpenSSH_7.4p1

[ssh]
enabled = true
listen_endpoints = tcp:2222:interface=0.0.0.0
version = SSH-2.0-OpenSSH_7.4p1

[telnet]
enabled = true
listen_endpoints = tcp:2323:interface=0.0.0.0

# JSON output for analysis
[output_jsonlog]
enabled = true
logfile = var/log/cowrie/cowrie.json

# SQLite database
[output_sqlite]
enabled = true
db_file = var/lib/cowrie/cowrie.db

# Text log
[output_textlog]
enabled = true
logfile = var/log/cowrie/cowrie.log

# Download storage
[output_localstorage]
enabled = true

# Session recording
[shell]
filesystem = share/cowrie/fs.pickle
EOF

    echo "Configuration created: etc/cowrie.cfg"
fi

# Set up iptables rules (optional, requires sudo)
echo "[6/7] Setting up port forwarding (requires sudo)..."
read -p "Forward port 23→2323 (telnet) and 22→2222 (SSH)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo iptables -t nat -A PREROUTING -p tcp --dport 23 -j REDIRECT --to-port 2323
    sudo iptables -t nat -A PREROUTING -p tcp --dport 22 -j REDIRECT --to-port 2222
    echo "Port forwarding enabled"
    echo "To make permanent: sudo iptables-save > /etc/iptables/rules.v4"
else
    echo "Skipping port forwarding. Access honeypot on ports 2222 (SSH) and 2323 (Telnet)"
fi

# Start Cowrie
echo "[7/7] Starting Cowrie..."
bin/cowrie start

echo
echo "✅ Cowrie honeypot deployed successfully!"
echo
echo "Status: $(bin/cowrie status)"
echo
echo "Logs:"
echo "  JSON: ${LOG_DIR}/cowrie.json"
echo "  Text: ${LOG_DIR}/cowrie.log"
echo
echo "Database: var/lib/cowrie/cowrie.db"
echo
echo "Access honeypot:"
echo "  SSH:    ssh -p 2222 root@localhost"
echo "  Telnet: telnet localhost 2323"
echo
echo "Common credentials to try:"
echo "  root:root"
echo "  admin:admin"
echo "  admin:password"
echo
echo "View logs in real-time:"
echo "  tail -f ${LOG_DIR}/cowrie.log"
echo
echo "Analyze JSON logs:"
echo "  python3 ../../ai/analyze_honeypot_logs.py ${LOG_DIR}/cowrie.json"
echo
echo "Stop honeypot:"
echo "  bin/cowrie stop"
echo
echo "⚠️  SAFETY REMINDER:"
echo "  - Ensure network isolation (no Internet access)"
echo "  - Monitor for unauthorized activity"
echo "  - Review logs regularly"
echo "  - Decommission when research complete"
echo

#!/bin/bash
#
# Mirai 2026 - Live Testing Sandbox Environment
# Creates an isolated testing environment for safe experimentation
#
# Features:
# - Isolated Docker network
# - Honeypot targets
# - Mock IDS/IPS
# - Traffic monitoring
# - Safe to run locally
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Mirai 2026 - Live Testing Environment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Error: Docker Compose is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Docker and Docker Compose found${NC}"
}

# Create isolated network
create_network() {
    echo -e "${YELLOW}Creating isolated network...${NC}"
    
    docker network create mirai-sandbox 2>/dev/null || true
    
    echo -e "${GREEN}✓ Network 'mirai-sandbox' ready${NC}"
}

# Start honeypot targets
start_honeypots() {
    echo -e "${YELLOW}Starting honeypot targets...${NC}"
    
    # HTTP honeypot
    docker run -d \
        --name honeypot-http \
        --network mirai-sandbox \
        -p 8080:80 \
        nginx:alpine
    
    # Telnet honeypot
    docker run -d \
        --name honeypot-telnet \
        --network mirai-sandbox \
        -p 2323:23 \
        cowrie/cowrie:latest
    
    # SSH honeypot
    docker run -d \
        --name honeypot-ssh \
        --network mirai-sandbox \
        -p 2222:22 \
        cowrie/cowrie:latest
    
    echo -e "${GREEN}✓ Honeypots started${NC}"
    echo "  - HTTP: localhost:8080"
    echo "  - Telnet: localhost:2323"
    echo "  - SSH: localhost:2222"
}

# Start mock IDS
start_mock_ids() {
    echo -e "${YELLOW}Starting mock IDS...${NC}"
    
    cat > /tmp/mock_ids.py << 'EOF'
#!/usr/bin/env python3
"""
Mock IDS - Simulates Intrusion Detection System
Monitors traffic and simulates detection/blocking
"""

from scapy.all import sniff, IP, TCP
import time

detection_count = 0
blocked_ips = set()

def packet_callback(packet):
    global detection_count
    
    if IP in packet and TCP in packet:
        src_ip = packet[IP].src
        
        # Simple detection rules
        if packet[TCP].dport == 23:  # Telnet scanning
            detection_count += 1
            print(f"[ALERT] Telnet scan detected from {src_ip}")
            
            if detection_count > 10:
                blocked_ips.add(src_ip)
                print(f"[BLOCK] Blocked {src_ip} (threshold exceeded)")
        
        if packet[TCP].flags == 'S' and detection_count > 5:
            # SYN flood detection
            print(f"[ALERT] Possible SYN flood from {src_ip}")

print("Mock IDS started - monitoring traffic...")
print("Detection threshold: 10 alerts per IP")

sniff(filter="tcp", prn=packet_callback, count=0)
EOF

    docker run -d \
        --name mock-ids \
        --network mirai-sandbox \
        --cap-add=NET_ADMIN \
        -v /tmp/mock_ids.py:/ids.py \
        python:3.11-slim \
        bash -c "pip install scapy && python /ids.py"
    
    echo -e "${GREEN}✓ Mock IDS started${NC}"
}

# Start traffic monitor
start_traffic_monitor() {
    echo -e "${YELLOW}Starting traffic monitor...${NC}"
    
    docker run -d \
        --name traffic-monitor \
        --network mirai-sandbox \
        -p 9000:9000 \
        nicolaka/netshoot \
        tcpdump -i any -n
    
    echo -e "${GREEN}✓ Traffic monitor started${NC}"
}

# Start test bot
start_test_bot() {
    echo -e "${YELLOW}Starting test bot...${NC}"
    
    cd "$PROJECT_ROOT"
    
    docker-compose -f docker-compose.sandbox.yml up -d bot
    
    echo -e "${GREEN}✓ Test bot started${NC}"
}

# Show status
show_status() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Sandbox Environment Status${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    
    docker ps --filter "network=mirai-sandbox" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo -e "${YELLOW}Access Points:${NC}"
    echo "  - Grafana: http://localhost:3000 (admin/admin)"
    echo "  - Prometheus: http://localhost:9091"
    echo "  - Honeypot HTTP: http://localhost:8080"
    echo "  - Bot Metrics: http://localhost:9090/metrics"
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo "  - View bot logs:  docker logs -f mirai-bot"
    echo "  - View IDS logs:  docker logs -f mock-ids"
    echo "  - View traffic:   docker logs -f traffic-monitor"
    echo "  - Stop sandbox:   bash $0 stop"
    echo ""
}

# Stop sandbox
stop_sandbox() {
    echo -e "${YELLOW}Stopping sandbox environment...${NC}"
    
    docker stop honeypot-http honeypot-telnet honeypot-ssh mock-ids traffic-monitor 2>/dev/null || true
    docker rm honeypot-http honeypot-telnet honeypot-ssh mock-ids traffic-monitor 2>/dev/null || true
    
    cd "$PROJECT_ROOT"
    docker-compose -f docker-compose.sandbox.yml down 2>/dev/null || true
    
    docker network rm mirai-sandbox 2>/dev/null || true
    
    echo -e "${GREEN}✓ Sandbox stopped and cleaned up${NC}"
}

# Clean up
cleanup() {
    echo -e "${YELLOW}Cleaning up...${NC}"
    
    rm -f /tmp/mock_ids.py
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Main logic
case "${1:-start}" in
    start)
        check_prerequisites
        create_network
        start_honeypots
        sleep 2
        start_mock_ids
        sleep 2
        start_traffic_monitor
        sleep 2
        start_test_bot
        show_status
        
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}Sandbox is ready!${NC}"
        echo -e "${GREEN}========================================${NC}"
        ;;
    
    stop)
        stop_sandbox
        cleanup
        ;;
    
    status)
        show_status
        ;;
    
    logs)
        docker logs -f "${2:-mirai-bot}"
        ;;
    
    *)
        echo "Usage: $0 {start|stop|status|logs [container]}"
        exit 1
        ;;
esac

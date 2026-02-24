# Live Testing Environment

## Overview

A completely isolated sandbox environment for safely testing and demonstrating Mirai 2026 features.

## Features

✅ **Isolated Network**: All traffic contained within Docker network  
✅ **Honeypot Targets**: Realistic test targets (HTTP, Telnet, SSH)  
✅ **Mock IDS**: Simulates intrusion detection and blocking  
✅ **Traffic Monitoring**: Real-time packet capture  
✅ **Full Observability**: Grafana dashboards + Prometheus metrics  
✅ **Safe**: Cannot affect external systems  

## Quick Start

### 1. Start Sandbox

```bash
cd tutorials/live_demo/
bash sandbox_environment.sh start
```

**Wait for**:
```
✓ Network 'mirai-sandbox' ready
✓ Honeypots started
✓ Mock IDS started
✓ Traffic monitor started
✓ Test bot started

Sandbox is ready!
```

### 2. Access Interfaces

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9091
- **Honeypot HTTP**: http://localhost:8080
- **Bot Metrics**: http://localhost:9090/metrics

### 3. Watch in Real-Time

```bash
# Terminal 1: Bot logs
docker logs -f mirai-bot-sandbox

# Terminal 2: IDS logs
docker logs -f mock-ids

# Terminal 3: Traffic
docker logs -f traffic-monitor

# Terminal 4: Metrics
watch -n 1 'curl -s http://localhost:9090/metrics | grep mirai'
```

### 4. Stop Sandbox

```bash
bash sandbox_environment.sh stop
```

## What Happens

### Phase 1: Initialization (0-30s)
- Bot starts and loads configuration
- Detection engine initializes
- RL agent loads (or starts fresh)
- Connects to AI service

### Phase 2: Reconnaissance (30s-2min)
- Scanner module starts
- Sends SYN packets to discover targets
- Finds honeypots on network
- Attempts telnet/SSH connections

### Phase 3: Attack Attempts (2-5min)
- Tries credential brute-forcing on honeypots
- Attempts various attack vectors
- Mock IDS starts detecting activity
- Packet drop rate increases

### Phase 4: Detection & Evasion (5-10min)
- Bot detects IDS blocking traffic
- Detection engine triggers evasion
- Signature changes applied
- Scan rate reduced
- New attack patterns tried

### Phase 5: Learning (10min+)
- RL agent learns from experience
- Q-table or DNN updates
- Future attacks adapt based on what worked
- Cycle continues

## Live Demonstrations

### Demo 1: Detection in Action

```bash
# Start sandbox
bash sandbox_environment.sh start

# Open Grafana Detection Dashboard
open http://localhost:3000/d/detection-events

# Watch detection events appear in real-time
# You should see:
# - IDS detections (honeypot interactions)
# - Evasion actions triggered
# - Signature changes
```

### Demo 2: RL Agent Learning

```bash
# Terminal 1: Start sandbox
bash sandbox_environment.sh start

# Terminal 2: Watch RL agent
docker exec -it mirai-ai-sandbox python -c "
from adaptive_agent import AdaptiveAgent
agent = AdaptiveAgent()

# Watch Q-table grow
while True:
    print(f'Q-table size: {len(agent.q_table)}')
    print(f'Total rewards: {agent.total_rewards}')
    time.sleep(5)
"
```

### Demo 3: Traffic Analysis

```bash
# Capture traffic to PCAP file
docker exec traffic-monitor tcpdump -i any -w /tmp/capture.pcap

# After 5 minutes, copy and analyze
docker cp traffic-monitor:/tmp/capture.pcap ./
wireshark capture.pcap

# Look for:
# - SYN scans to port 23, 2323
# - Telnet login attempts
# - Changes in traffic patterns (evasion)
```

## Test Scenarios

### Scenario 1: IDS Blocking

**Objective**: Demonstrate bot detecting and evading IDS

```bash
# 1. Start sandbox
bash sandbox_environment.sh start

# 2. Force aggressive scanning
docker exec mirai-bot-sandbox \
  /app/mirai_bot --scan-rate 5000

# 3. Watch IDS start blocking
docker logs -f mock-ids
# You'll see: [BLOCK] messages

# 4. Watch bot respond
docker logs -f mirai-bot-sandbox
# You'll see: [WARN] IDS detected - changing signature
```

### Scenario 2: Honeypot Detection

**Objective**: Show bot identifying honeypots

```bash
# Honeypots have characteristic patterns:
# - Too many open ports
# - Fake banners
# - Instant responses

# Watch bot detect honeypot
docker logs -f mirai-bot-sandbox | grep -i honeypot
# Expected: "Honeypot suspected: unusual response pattern"
```

### Scenario 3: Federated Learning

**Objective**: Multiple bots learning together

```bash
# Scale to 5 bots
docker-compose -f docker-compose.sandbox.yml up -d --scale bot=5

# Each bot learns independently
# Updates sent to AI service
# Global model aggregated
# Distributed back to all bots

# Monitor aggregation
docker logs -f mirai-ai-sandbox | grep "Aggregating"
```

## Architecture

```
┌─────────────────────────────────────────────┐
│          Docker Network: mirai-sandbox       │
│                                             │
│  ┌──────────┐    ┌──────────┐              │
│  │ Bot      │───▶│Honeypot  │              │
│  │          │    │HTTP:8080 │              │
│  └────┬─────┘    └──────────┘              │
│       │                                     │
│       │          ┌──────────┐              │
│       ├─────────▶│Honeypot  │              │
│       │          │Telnet:23 │              │
│       │          └──────────┘              │
│       │                                     │
│       │          ┌──────────┐              │
│       ├─────────▶│Mock IDS  │              │
│       │          │(Scapy)   │              │
│       │          └──────────┘              │
│       │                                     │
│       │          ┌──────────┐              │
│       └─────────▶│AI Service│              │
│                  │(Flask)   │              │
│                  └──────────┘              │
│                                             │
│  ┌──────────┐    ┌──────────┐              │
│  │Prometheus│───▶│ Grafana  │              │
│  │:9091     │    │:3000     │              │
│  └──────────┘    └──────────┘              │
└─────────────────────────────────────────────┘
         ↓
   (Isolated - No external traffic)
```

## Metrics to Watch

### Bot Performance
- `mirai_bot_successful_attacks_total`
- `mirai_bot_failed_attacks_total`
- `mirai_scanner_active_connections`
- `mirai_bot_packets_sent_total`

### Detection & Evasion
- `mirai_bot_detections_total{type="ids_ips"}`
- `mirai_bot_detections_total{type="honeypot"}`
- `mirai_bot_evasion_actions_total`
- `mirai_bot_signature_changes_total`

### Learning
- `mirai_ai_agent_reward_total`
- `mirai_ai_agent_episodes_total`
- `mirai_ai_q_table_size`

## Customization

### Change Attack Intensity

Edit `config/sandbox.json`:
```json
{
  "scanner": {
    "scan_rate_pps": 1000  // Increase for more aggressive
  }
}
```

### Add More Honeypots

```bash
docker run -d \
  --name honeypot-custom \
  --network mirai-sandbox \
  -p 3000:3000 \
  your-honeypot-image
```

### Modify IDS Rules

Edit `/tmp/mock_ids.py` before starting:
```python
# Change detection threshold
if detection_count > 5:  # More sensitive
    blocked_ips.add(src_ip)
```

## Safety Features

The sandbox is designed to be completely safe:

1. **Network Isolation**: Traffic never leaves Docker network
2. **No External Targets**: Whitelist prevents scanning outside
3. **Rate Limiting**: Max 10 targets/second
4. **Sandbox Mode**: Special safety checks enabled
5. **Easy Cleanup**: One command stops everything

## Troubleshooting

**Sandbox won't start?**
```bash
# Check Docker
docker ps
docker network ls

# Check logs
bash sandbox_environment.sh logs bot
```

**No traffic being generated?**
```bash
# Check bot is running
docker ps | grep mirai-bot

# Check configuration
docker exec mirai-bot-sandbox cat /app/config/bot.json
```

**IDS not detecting?**
```bash
# Check IDS is running
docker logs mock-ids

# Increase scan rate
docker exec mirai-bot-sandbox \
  kill -HUP 1  # Reload config
```

## Educational Use

This sandbox is perfect for:
- **Classroom demonstrations**
- **Security training**
- **Research experiments**
- **Algorithm testing**
- **Performance tuning**

**Remember**: This is for EDUCATION ONLY. Never use against systems you don't own.

## Cleanup

```bash
# Stop and remove everything
bash sandbox_environment.sh stop

# Verify cleanup
docker ps -a | grep sandbox
docker network ls | grep sandbox
```

## Next Steps

After exploring the sandbox:
1. Try the interactive tutorials
2. Modify RL agent parameters
3. Implement custom attack vectors
4. Add new detection methods
5. Deploy to Kubernetes (Tutorial 4)

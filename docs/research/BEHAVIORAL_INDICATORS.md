# Behavioral Indicators for IoT Botnet Detection

**Purpose:** Comprehensive guide to behavioral patterns for detection  
**Target:** SOC analysts, incident responders, threat hunters  
**Last Updated:** 2026-02-25

---

## Overview

Behavioral detection focuses on **what the malware does** rather than **what it looks like**. This approach catches variants and zero-days that signature-based detection might miss.

---

## 1. Process Behavior Indicators

### 1.1 Suspicious Process Characteristics

**High Risk Indicators:**
```yaml
process_indicators:
  unlinked_binary: true         # /proc/PID/exe shows (deleted)
  spoofed_name: true             # Named systemd but PPID != 1
  parent_is_init: true           # Orphaned process
  no_terminal: true              # No controlling TTY
  unusual_location: true         # Running from /tmp or /var/tmp
  
risk_score: 90/100
```

**Detection Script:**
```python
import psutil
import os

def check_process_indicators(pid):
    proc = psutil.Process(pid)
    indicators = {
        'unlinked_binary': False,
        'spoofed_name': False,
        'no_terminal': False,
        'unusual_location': False,
        'risk_score': 0
    }
    
    # Check if binary is unlinked
    try:
        exe = proc.exe()
        if not os.path.exists(exe):
            indicators['unlinked_binary'] = True
            indicators['risk_score'] += 30
    except:
        pass
    
    # Check for process name spoofing
    if proc.name() in ['systemd', 'init', 'kworker'] and proc.ppid() != 1:
        indicators['spoofed_name'] = True
        indicators['risk_score'] += 25
    
    # Check for no terminal
    try:
        if proc.terminal() is None and proc.name() not in ['systemd', 'kworker']:
            indicators['no_terminal'] = True
            indicators['risk_score'] += 15
    except:
        pass
    
    # Check location
    try:
        exe_path = proc.exe()
        if '/tmp' in exe_path or '/var/tmp' in exe_path:
            indicators['unusual_location'] = True
            indicators['risk_score'] += 20
    except:
        pass
    
    return indicators
```

### 1.2 Process Resource Usage Patterns

**CPU Usage Anomalies:**
- Constant 100% CPU (attack execution)
- Periodic spikes every 60 seconds (heartbeat + scan)
- Low CPU <2% but high network I/O (efficient C&C)

**Memory Patterns:**
- Small footprint <10MB (typical for IoT malware)
- No memory growth (no memory leaks)
- Constant memory usage (static binary)

**Network I/O:**
- High outbound traffic
- Low/no inbound traffic
- Thousands of connections
- Burst patterns (scanning phases)

---

## 2. Network Behavior Indicators

### 2.1 Connection Patterns

**Scanner Behavior:**
```
Time    Src         Dst             Port  Flags
10:00   10.0.0.5    1.2.3.4        23    SYN
10:00   10.0.0.5    5.6.7.8        23    SYN
10:00   10.0.0.5    9.10.11.12     23    SYN
10:00   10.0.0.5    13.14.15.16    23    SYN
...
Pattern: Random IPs, fixed port, SYN only, no ACK
```

**C&C Communication:**
```
Time    Src         Dst             Port  Duration  Size
10:00   10.0.0.5    cnc.evil.com   666   Persistent <100 bytes/min
10:01   10.0.0.5    cnc.evil.com   666   Persistent <100 bytes/min
10:02   10.0.0.5    cnc.evil.com   666   Persistent <100 bytes/min
...
Pattern: Persistent connection, regular intervals, small packets
```

**DDoS Attack:**
```
Time    Src         Dst             Port  Protocol  Rate
10:00   10.0.0.5    target.com     80    UDP       50k pps
10:01   10.0.0.5    target.com     80    UDP       50k pps
10:02   10.0.0.5    target.com     80    UDP       50k pps
...
Pattern: Single target, high packet rate, uniform size
```

### 2.2 Traffic Volume Anomalies

**Baseline vs Attack:**
```
Metric              Baseline    During Attack   Delta
----------------------------------------------------------
Outbound Traffic    1 Mbps      500 Mbps       +49,900%
Connections/sec     10          5,000          +50,000%
Unique Dst IPs/hr   50          50,000         +100,000%
Avg Packet Size     1,200 B     64 B           -95%
```

---

## 3. System Behavior Indicators

### 3.1 File System Changes

**Suspicious File Operations:**
```bash
# New executables in temp directories
/tmp/.busybox
/var/tmp/.sh
/dev/shm/bot

# Hidden files with execute permission
find / -name ".*" -type f -executable 2>/dev/null

# Recently modified system files
find /bin /sbin /usr/bin -type f -mtime -1
```

**Persistence Mechanisms:**
```bash
# New cron jobs
diff <(cat /etc/crontab.backup) <(cat /etc/crontab)

# New systemd services
systemctl list-unit-files | grep enabled | diff systemd.baseline -

# Modified startup scripts
md5sum /etc/init.d/* | diff initd.md5sums -
```

### 3.2 Authentication Anomalies

**Failed Login Patterns:**
```
Time     User      Source        Result
10:00:01 admin     1.2.3.4      Failed
10:00:02 admin     1.2.3.4      Failed
10:00:03 root      1.2.3.4      Failed
10:00:04 root      1.2.3.4      Failed
10:00:05 user      1.2.3.4      Failed
...
Pattern: Sequential attempts, same source, different credentials
```

**Successful Suspicious Logins:**
```
Time     User      Source        Location      Device Type
10:05:30 root      1.2.3.4      Unknown       Unknown
Previous: admin    10.0.0.1     US/Office     Workstation

Alert: User changed, unknown source, no previous connection
```

---

## 4. Temporal Behavior Indicators

### 4.1 Activity Timelines

**Typical Infection Timeline:**
```
T+0:00  Initial compromise (telnet brute force success)
T+0:05  Download malware binary (wget/curl)
T+0:06  Execute binary
T+0:07  Kill competing bots
T+0:08  Disable watchdog
T+0:09  Hide process (rename, unlink)
T+0:10  Connect to C&C
T+0:15  Begin scanning for new targets
T+1:00  Receive attack command
T+1:01  Launch DDoS attack
```

**Periodic Patterns:**
```
Activity          Interval    Indicator
------------------------------------------------
Heartbeat         60s         Regular beaconing
Scan batch        5min        Burst of SYN packets
Report            15min       Upload scan results
Credential test   1s          Rapid login attempts
```

### 4.2 Anomalous Timing

**Off-Hours Activity:**
```
Normal activity hours: 08:00 - 18:00 local time
Alert: High network activity at 03:00 (scan phase)
Alert: New process started at 02:30 (no admin logged in)
```

---

## 5. Composite Behavioral Profiles

### Profile 1: Active Scanner

```yaml
name: "IoT_Scanner"
confidence: 95%

indicators:
  network:
    - high_syn_rate: true
    - random_destinations: true
    - fixed_port: 23
    - no_application_data: true
  
  process:
    - cpu_usage: 50-100%
    - network_tx_rate: high
    - open_sockets: 1000+
  
  timing:
    - burst_pattern: true
    - duration: 5-10 minutes
    - repeats: every 15 minutes

action: block_outbound_23
```

### Profile 2: C&C Client

```yaml
name: "Bot_CNC_Client"
confidence: 90%

indicators:
  network:
    - persistent_connection: true
    - uncommon_port: 666
    - small_packets: <100 bytes
    - regular_interval: 60s
  
  process:
    - low_cpu: <5%
    - single_connection: true
    - unlinked_binary: true
  
  system:
    - no_terminal: true
    - parent_init: true

action: isolate_device
```

### Profile 3: DDoS Attacker

```yaml
name: "DDoS_Bot"
confidence: 98%

indicators:
  network:
    - single_target: true
    - high_packet_rate: 10k+ pps
    - outbound_only: true
    - protocol: UDP/TCP_SYN
  
  process:
    - cpu_usage: 100%
    - memory_stable: true
    - thousands_sockets: true
  
  system:
    - network_saturation: true

action: emergency_block
```

---

## 6. Machine Learning Features

### Feature Engineering for Detection

**Feature Set (42 features):**
```python
features = {
    # Process features (10)
    'proc_cpu_percent': float,
    'proc_memory_mb': float,
    'proc_num_threads': int,
    'proc_num_fds': int,
    'proc_has_terminal': bool,
    'proc_parent_is_init': bool,
    'proc_exe_exists': bool,
    'proc_name_length': int,
    'proc_cmdline_length': int,
    'proc_age_seconds': int,
    
    # Network features (20)
    'net_connections_total': int,
    'net_connections_established': int,
    'net_unique_dst_ips_1min': int,
    'net_unique_dst_ips_5min': int,
    'net_unique_dst_ports': int,
    'net_syn_packets_per_sec': float,
    'net_tx_bytes_per_sec': int,
    'net_rx_bytes_per_sec': int,
    'net_tx_rx_ratio': float,
    'net_avg_packet_size': float,
    'net_connection_duration_avg': float,
    'net_connection_duration_std': float,
    'net_port_23_connections': int,
    'net_failed_connections': int,
    'net_persistent_connections': int,
    'net_interval_regularity': float,  # 0-1, 1=perfect regularity
    'net_protocol_diversity': float,   # Shannon entropy
    'net_dst_ip_entropy': float,
    'net_burst_pattern': bool,
    'net_beacon_detected': bool,
    
    # System features (12)
    'sys_file_tmp_executable': bool,
    'sys_hidden_files': int,
    'sys_recent_cron_changes': bool,
    'sys_failed_auth_1min': int,
    'sys_failed_auth_5min': int,
    'sys_off_hours_activity': bool,
    'sys_watchdog_access': bool,
    'sys_prctl_calls': int,
    'sys_ioctl_calls': int,
    'sys_unlink_calls': int,
    'sys_network_namespace_change': bool,
    'sys_capabilities_dropped': bool,
}
```

### Training Labels

```python
labels = {
    'benign': 0,
    'scanner': 1,
    'cnc_client': 2,
    'ddos_attacker': 3,
    'loader': 4,
    'credential_stealer': 5,
}
```

---

## 7. Real-Time Monitoring

### Detection Script Example

```bash
#!/bin/bash
# Real-time behavioral monitoring

# Monitor process anomalies
while true; do
    # Check for unlinked binaries
    unlinked=$(ls -la /proc/*/exe 2>/dev/null | grep deleted | wc -l)
    if [ $unlinked -gt 0 ]; then
        echo "ALERT: $unlinked unlinked binaries detected"
        ls -la /proc/*/exe 2>/dev/null | grep deleted
    fi
    
    # Check for high SYN rate
    syn_rate=$(netstat -s | grep "SYNs to LISTEN" | awk '{print $1}')
    sleep 1
    syn_rate_new=$(netstat -s | grep "SYNs to LISTEN" | awk '{print $1}')
    syn_per_sec=$((syn_rate_new - syn_rate))
    
    if [ $syn_per_sec -gt 100 ]; then
        echo "ALERT: High SYN rate: $syn_per_sec/sec"
    fi
    
    # Check for suspicious processes
    ps aux | awk '$3 > 90' | grep -v "^\[" | while read line; do
        echo "ALERT: High CPU process: $line"
    done
    
    sleep 5
done
```

---

## Summary Checklist

**Quick Behavioral Assessment:**

Process:
- [ ] Check for unlinked binaries
- [ ] Verify process names match parents
- [ ] Check CPU/memory usage patterns
- [ ] Review open file descriptors

Network:
- [ ] Monitor connection counts
- [ ] Check for scanning patterns
- [ ] Identify persistent connections
- [ ] Measure traffic volume

System:
- [ ] Review failed authentication
- [ ] Check temp directories
- [ ] Verify cron jobs
- [ ] Monitor file changes

**Risk Scoring:**
- 0-30: Low risk (normal activity)
- 31-60: Medium risk (investigate)
- 61-80: High risk (contain)
- 81-100: Critical risk (isolate immediately)

---

**Last Updated:** 2026-02-25  
**Version:** 1.0  
**Maintained By:** Security Research Team

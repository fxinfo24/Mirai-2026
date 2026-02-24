# Detection Methods for Mirai-Style Botnets

> **Purpose:** Educational guide for security researchers on detecting stealth techniques
>
> **Audience:** Security analysts, SOC teams, threat hunters
>
> **Last Updated:** 2026-02-25

---

## Overview

This document describes detection methods for the stealth and efficiency techniques implemented in Mirai 2026. Understanding these techniques enables better defensive strategies.

## 1. Process Hiding Detection

### Technique: Random Process Names
**How it works:**
```c
// Random process name generation
name_buf_len = ((rand_next() % 6) + 3) * 4;
rand_alphastr(name_buf, name_buf_len);
prctl(PR_SET_NAME, name_buf);
```

**Detection Methods:**

**A. Process Tree Analysis**
```bash
# Look for processes without parent relationship
ps auxf | grep -v "?"

# Check for orphaned processes
ps -eo pid,ppid,comm | awk '$2 == 1'
```

**B. Behavioral Analysis**
- Processes making network connections without valid service name
- Unusual CPU usage patterns
- Processes in unexpected directories

**C. File System Monitoring**
```bash
# Detect unlinked but running binaries
lsof | grep deleted
```

### Technique: Binary Self-Deletion
**Detection:**
```bash
# Monitor for unlink() system calls on running executables
auditctl -a always,exit -F arch=b64 -S unlink -k binary_deletion
```

---

## 2. Anti-Debugging Detection

### Technique: Signal-Based Control Flow
**How it works:**
```c
signal(SIGTRAP, &anti_gdb_entry);
```

**Detection Methods:**

**A. System Call Monitoring**
```bash
# Monitor ptrace and signal syscalls
strace -e trace=signal,ptrace <process>
```

**B. Dynamic Analysis**
- Use kernel-level debuggers (kgdb)
- Hardware breakpoints instead of software
- VM introspection tools

**C. Memory Analysis**
```bash
# Dump process memory and analyze
gcore <pid>
strings core.<pid> | grep -E "(signal|debug|trace)"
```

---

## 3. Watchdog Manipulation Detection

### Technique: Disable Hardware Watchdog
**How it works:**
```c
ioctl(wfd, 0x80045704, &one);  // WDIOS_DISABLECARD
```

**Detection Methods:**

**A. Audit Watchdog Access**
```bash
# Monitor /dev/watchdog access
auditctl -w /dev/watchdog -p wa -k watchdog_access
auditctl -w /dev/misc/watchdog -p wa -k watchdog_access
```

**B. Kernel Module Monitoring**
```bash
# Check watchdog driver status
cat /sys/class/watchdog/watchdog0/state
cat /sys/class/watchdog/watchdog0/timeout
```

**C. System Logs**
```bash
# Look for watchdog events
journalctl -k | grep watchdog
dmesg | grep -i watchdog
```

---

## 4. Network Scanner Detection

### Technique: High-Speed SYN Scanning
**Characteristics:**
- 1000+ SYNs/second per host
- Randomized target IPs
- Randomized source ports
- No follow-up after SYN-ACK

**Detection Methods:**

**A. NetFlow Analysis**
```bash
# Detect high SYN rate from single source
nfdump -R /var/log/netflow -o extended | \
  awk '/SYN/ {print $1}' | sort | uniq -c | sort -nr
```

**B. IDS/IPS Rules (Snort/Suricata)**
```
# Detect SYN flood pattern
alert tcp any any -> any [23,2323,22,80] (
  flags: S;
  threshold: type both, track by_src, count 100, seconds 1;
  msg: "Possible Mirai-style SYN scanner";
  sid: 1000001;
)
```

**C. Firewall Monitoring**
```bash
# iptables rate limiting
iptables -A INPUT -p tcp --syn -m limit --limit 10/s -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP
```

---

## 5. Telnet Brute Force Detection

### Technique: Credential Cycling
**Pattern:**
- Multiple rapid authentication attempts
- Different credentials each attempt
- Reporting to port 48101

**Detection Methods:**

**A. Failed Login Monitoring**
```bash
# Monitor auth.log
tail -f /var/log/auth.log | grep "Failed password"

# Count failed attempts
awk '/Failed password/ {print $11}' /var/log/auth.log | \
  sort | uniq -c | sort -nr
```

**B. Honeypot Deployment**
```bash
# Run honeypot telnet service
cowrie --port 2323
```

**C. Network Pattern Detection**
```
# Suricata rule for port 48101 (report server)
alert tcp any any -> any 48101 (
  msg: "Mirai scan result reporting detected";
  flow: to_server, established;
  sid: 1000002;
)
```

---

## 6. Multi-IP Loading Detection

### Technique: Source IP Rotation
**Pattern:**
- Multiple source IPs
- High connection rate per IP (~12k connections)
- All targeting same services (telnet/SSH)

**Detection Methods:**

**A. Connection Tracking**
```bash
# Monitor active connections per source IP
netstat -an | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr
```

**B. Rate Limiting**
```bash
# iptables connlimit
iptables -A INPUT -p tcp --dport 23 -m connlimit \
  --connlimit-above 10 --connlimit-mask 32 -j REJECT
```

---

## 7. Detection Tool Recommendations

### Network Level
- **Zeek (Bro)** - Network traffic analysis
- **Suricata** - IDS/IPS with modern protocol support
- **Arkime (Moloch)** - Full packet capture and analysis

### Host Level
- **osquery** - SQL-powered host monitoring
- **Sysmon** - Enhanced system logging
- **auditd** - Linux audit framework

### SIEM Integration
```bash
# Example: Send to Elastic Stack
filebeat -e -c filebeat.yml
```

---

## 8. YARA Rules

```yara
rule Mirai_ProcessHiding {
    meta:
        description = "Detects Mirai process hiding techniques"
        author = "Mirai 2026 Research"
    
    strings:
        $prctl = "prctl" ascii
        $rand_name = /[a-zA-Z]{12,24}/ ascii
        $unlink_self = "unlink" ascii
    
    condition:
        all of them
}

rule Mirai_NetworkScanner {
    meta:
        description = "Detects Mirai SYN scanner"
    
    strings:
        $raw_sock = "SOCK_RAW" ascii
        $iphdr = "IP_HDRINCL" ascii
        $syn_flag = { 02 00 00 00 }  // SYN flag
    
    condition:
        all of them
}
```

---

## 9. Incident Response Playbook

### Phase 1: Detection
1. Alert triggered (high SYN rate, failed logins)
2. Verify it's not legitimate traffic
3. Identify infected hosts

### Phase 2: Containment
```bash
# Immediate actions
# 1. Block C&C domain
iptables -A OUTPUT -d <cnc_ip> -j DROP

# 2. Kill malicious process
kill -9 <pid>

# 3. Block scanner port
iptables -A OUTPUT -p tcp --dport 48101 -j DROP
```

### Phase 3: Eradication
```bash
# 1. Find and remove binary
lsof -p <pid> | grep deleted
rm <binary_path>

# 2. Check for persistence
crontab -l
ls /etc/init.d/
systemctl list-units
```

### Phase 4: Recovery
- Change all credentials
- Update firmware
- Apply security patches
- Monitor for reinfection

---

## 10. Proactive Defense

### IoT Device Hardening
```bash
# Disable telnet
systemctl stop telnet
systemctl disable telnet

# Enable SSH with key-based auth only
# Change default credentials
# Enable firewall
```

### Network Segmentation
- Isolate IoT devices on separate VLAN
- Restrict outbound connections
- Monitor east-west traffic

---

**Next Steps:** See `COUNTERMEASURES.md` for defensive strategies

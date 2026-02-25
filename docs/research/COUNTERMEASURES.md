# Countermeasures Against Mirai-Style Botnets

> **Purpose:** Defensive strategies for protecting against IoT botnet threats
>
> **Audience:** System administrators, IoT manufacturers, security teams
>
> **Last Updated:** 2026-02-25

---

## Defense in Depth Strategy

Protection against sophisticated botnets requires **multiple layers** of defense. No single countermeasure is sufficient.

```
┌─────────────────────────────────────┐
│   Layer 1: Device Hardening         │  ← Primary defense
├─────────────────────────────────────┤
│   Layer 2: Network Segmentation     │  ← Limit blast radius
├─────────────────────────────────────┤
│   Layer 3: Traffic Monitoring       │  ← Early detection
├─────────────────────────────────────┤
│   Layer 4: Incident Response        │  ← Rapid containment
└─────────────────────────────────────┘
```

---

## Layer 1: Device Hardening

### 1.1 Eliminate Default Credentials

**Problem:** Mirai's primary attack vector is default credentials.

**Solution:**
```bash
# Force password change on first boot
if [ ! -f /etc/.password_changed ]; then
    echo "You must change the default password!"
    passwd
    touch /etc/.password_changed
fi
```

**Best Practices:**
- ✅ Generate unique passwords per device (printed on label)
- ✅ Require password change on first login
- ✅ Enforce strong password policy
- ❌ Never ship with `admin:admin` or similar

### 1.2 Disable Unnecessary Services

**Telnet must die:**
```bash
# Disable telnet completely
systemctl stop telnetd
systemctl disable telnetd
apt-get remove telnetd

# Or block via firewall
iptables -A INPUT -p tcp --dport 23 -j DROP
```

**SSH hardening:**
```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no  # Use keys only
PubkeyAuthentication yes
Port 2222  # Non-standard port
```

### 1.3 Watchdog Protection

**Prevent watchdog manipulation:**
```bash
# Restrict /dev/watchdog access
chmod 600 /dev/watchdog
chown root:root /dev/watchdog

# SELinux/AppArmor policy
# Deny ioctl on watchdog device
```

**Monitor watchdog:**
```bash
# systemd watchdog monitoring
[Service]
WatchdogSec=30s
Restart=on-failure
```

### 1.4 Process Monitoring

**Detect unusual processes:**
```bash
# Monitor for processes without valid path
#!/bin/bash
while true; do
    lsof | grep deleted | while read line; do
        echo "ALERT: Unlinked running binary detected: $line"
        # Take action: kill, log, alert
    done
    sleep 60
done
```

---

## Layer 2: Network Segmentation

### 2.1 IoT VLAN Isolation

**Network architecture:**
```
┌─────────────┐
│   Internet  │
└──────┬──────┘
       │
┌──────▼──────────────┐
│   Firewall/Router   │
└──┬──────────────┬───┘
   │              │
   │              │
┌──▼─────┐    ┌──▼─────────┐
│ Trusted│    │ IoT VLAN   │ ← Isolated
│ Network│    │ (No Inter- │
│        │    │  net Access│
└────────┘    └────────────┘
```

**Firewall rules:**
```bash
# Allow IoT devices to reach specific services only
iptables -A FORWARD -s 192.168.100.0/24 -d 192.168.1.10 -p tcp --dport 8123 -j ACCEPT
iptables -A FORWARD -s 192.168.100.0/24 -j DROP

# Block all outbound Internet from IoT VLAN
iptables -A FORWARD -s 192.168.100.0/24 -o eth0 -j DROP
```

### 2.2 Rate Limiting

**Prevent SYN floods:**
```bash
# iptables rate limiting
iptables -A INPUT -p tcp --syn -m limit --limit 10/s --limit-burst 20 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP

# Connection limiting per source
iptables -A INPUT -p tcp --dport 22 -m connlimit --connlimit-above 3 -j REJECT
```

### 2.3 Egress Filtering

**Block malicious outbound traffic:**
```bash
# Block port 48101 (Mirai report server)
iptables -A OUTPUT -p tcp --dport 48101 -j DROP

# Block common C&C ports
for port in 23 48101; do
    iptables -A OUTPUT -p tcp --dport $port -m state --state NEW -j LOG --log-prefix "SUSPICIOUS_OUTBOUND: "
done
```

---

## Layer 3: Traffic Monitoring

### 3.1 Network IDS/IPS

**Suricata rules:**
```
# Detect Mirai scanning
alert tcp any any -> any [23,2323,22] (
    msg: "Possible Mirai telnet scan";
    flags: S;
    threshold: type both, track by_src, count 50, seconds 10;
    classtype: attempted-recon;
    sid: 2000001;
)

# Detect scan result reporting
alert tcp any any -> any 48101 (
    msg: "Mirai scan result reporting";
    flow: to_server;
    classtype: trojan-activity;
    sid: 2000002;
)

# Detect C&C communication
alert tcp any any -> any any (
    msg: "Possible Mirai C&C beacon";
    content: "|00 00 00 01|";
    offset: 0;
    depth: 4;
    classtype: trojan-activity;
    sid: 2000003;
)
```

### 3.2 NetFlow Analysis

**Detect anomalies:**
```python
#!/usr/bin/env python3
# Detect high SYN rate (indicator of scanning)

import pyshark

def analyze_traffic():
    capture = pyshark.LiveCapture(interface='eth0', bpf_filter='tcp[tcpflags] & tcp-syn != 0')
    
    syn_count = {}
    
    for packet in capture.sniff_continuously():
        src = packet.ip.src
        syn_count[src] = syn_count.get(src, 0) + 1
        
        # Alert if >100 SYNs in buffer
        if syn_count[src] > 100:
            print(f"ALERT: High SYN rate from {src}")
            # Take action: block, log, alert
```

### 3.3 DNS Monitoring

**Detect C&C communication:**
```bash
# Monitor DNS queries for suspicious domains
tcpdump -i eth0 -n port 53 | grep -E "(cnc|bot|mirai)"
```

---

## Layer 4: Endpoint Protection

### 4.1 System Hardening

**Kernel hardening:**
```bash
# /etc/sysctl.conf

# Prevent IP spoofing
net.ipv4.conf.all.rp_filter = 1

# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0

# Enable SYN cookies (prevent SYN floods)
net.ipv4.tcp_syncookies = 1

# Reduce TCP timeouts
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
```

**File integrity monitoring:**
```bash
# AIDE - Advanced Intrusion Detection Environment
apt-get install aide
aide --init
aide --check
```

### 4.2 Process Execution Control

**AppArmor profile:**
```
# /etc/apparmor.d/usr.bin.iot-service
/usr/bin/iot-service {
    # Allow necessary operations
    network inet stream,
    /etc/iot-config r,
    
    # Deny dangerous operations
    deny /dev/watchdog rw,
    deny capability sys_admin,
    deny @{PROC}/*/exe r,
}
```

### 4.3 Auditd Rules

**Monitor suspicious activity:**
```bash
# /etc/audit/rules.d/mirai.rules

# Monitor watchdog access
-w /dev/watchdog -p wa -k watchdog_access

# Monitor process name changes
-a always,exit -F arch=b64 -S prctl -k process_name_change

# Monitor raw socket creation
-a always,exit -F arch=b64 -S socket -F a0=2 -F a1=3 -k raw_socket

# Monitor self-deletion
-a always,exit -F arch=b64 -S unlink -k binary_deletion
```

---

## IoT Manufacturer Guidelines

### Secure by Design

**1. No Default Credentials**
```c
// Generate unique password on first boot
void generate_unique_password(char *output, size_t len) {
    // Use hardware serial number as seed
    uint32_t seed = get_device_serial();
    
    // Generate cryptographically secure password
    generate_password(seed, output, len);
    
    // Display to user on LCD/serial
    printf("Your device password: %s\n", output);
}
```

**2. Automatic Updates**
- Over-the-air (OTA) updates with signature verification
- Automatic security patches
- Rollback capability

**3. Minimal Attack Surface**
- Only enable necessary services
- No telnet/FTP by default
- Use secure protocols (SSH, HTTPS)

**4. Hardware Security**
- TPM/Secure Element for credential storage
- Secure boot
- Encrypted storage

---

## Cloud/Enterprise Scale

### 1. Automated Threat Response

**SOAR playbook:**
```yaml
# Automated response to Mirai detection
name: Mirai Botnet Response
trigger: 
  - IDS alert: Mirai detection
  
actions:
  1. Isolate infected device (VLAN quarantine)
  2. Block C&C domain/IP
  3. Capture network traffic (PCAP)
  4. Create incident ticket
  5. Notify SOC team
  6. Initiate forensics collection
```

### 2. Threat Intelligence Integration

**Feed examples:**
- Emerging Threats ruleset
- abuse.ch Mirai tracker
- Cisco Talos Intelligence

**Integration:**
```bash
# Auto-update IDS rules
curl https://rules.emergingthreats.net/open/suricata/emerging-botnet.rules \
  -o /etc/suricata/rules/emerging-botnet.rules
suricatasc -c reload-rules
```

---

## Honeypot Deployment for Research

### Purpose
Honeypots allow security researchers to:
- Observe botnet behavior in controlled environments
- Collect malware samples safely
- Understand attack patterns
- Test detection methods
- Generate threat intelligence

### 5.1 Low-Interaction Honeypot (Cowrie)

**Best for:** Capturing credentials, commands, and malware downloads

**Setup:**
```bash
# Install Cowrie SSH/Telnet honeypot
sudo apt-get install python3-virtualenv git
git clone https://github.com/cowrie/cowrie
cd cowrie
virtualenv cowrie-env
source cowrie-env/bin/activate
pip install -r requirements.txt

# Configure
cp etc/cowrie.cfg.dist etc/cowrie.cfg
```

**Configuration (etc/cowrie.cfg):**
```ini
[honeypot]
hostname = vulnerable-router
arch = armv7l

[ssh]
enabled = true
listen_endpoints = tcp:2222:interface=0.0.0.0

[telnet]
enabled = true
listen_endpoints = tcp:2323:interface=0.0.0.0

[output_jsonlog]
enabled = true
logfile = var/log/cowrie/cowrie.json

# Log all credentials attempted
[output_mysql]
enabled = true
host = localhost
database = cowrie
username = cowrie
password = secret
```

**Port forwarding (route traffic to honeypot):**
```bash
# Forward telnet to Cowrie
iptables -t nat -A PREROUTING -p tcp --dport 23 -j REDIRECT --to-port 2323

# Forward SSH to Cowrie
iptables -t nat -A PREROUTING -p tcp --dport 22 -j REDIRECT --to-port 2222
```

**Running:**
```bash
./bin/cowrie start
tail -f var/log/cowrie/cowrie.log
```

### 5.2 Medium-Interaction Honeypot (Custom)

**Architecture:**
```
┌────────────────────────────────────┐
│   Isolated Network (No Internet)   │
│                                    │
│  ┌──────────┐      ┌───────────┐  │
│  │ Honeypot │◄────►│ Fake C&C  │  │
│  │  Device  │      │  Server   │  │
│  └──────────┘      └───────────┘  │
│        ▲                           │
│        │                           │
└────────┼───────────────────────────┘
         │
    ┌────┴─────┐
    │ Observer │ ← Monitoring/Logging
    │  System  │
    └──────────┘
```

**Docker-based honeypot:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  honeypot:
    build: ./honeypot
    container_name: mirai_honeypot
    network_mode: "bridge"
    ports:
      - "23:23"    # Telnet
      - "2323:2323"
      - "22:22"    # SSH
    volumes:
      - ./logs:/var/log/honeypot
    environment:
      - HONEYPOT_MODE=research
    cap_add:
      - NET_ADMIN
    
  # Fake C&C server for analysis
  fake_cnc:
    build: ./fake-cnc
    container_name: fake_cnc_server
    ports:
      - "48101:48101"
    volumes:
      - ./cnc-logs:/var/log/cnc
    
  # Database for storing captures
  database:
    image: postgres:16
    environment:
      POSTGRES_DB: honeypot
      POSTGRES_USER: researcher
      POSTGRES_PASSWORD: research123
    volumes:
      - ./data:/var/lib/postgresql/data
```

**Honeypot Dockerfile:**
```dockerfile
FROM ubuntu:22.04

# Emulate vulnerable IoT device
RUN apt-get update && apt-get install -y \
    telnetd \
    openssh-server \
    tcpdump \
    strace

# Set weak credentials (intentionally)
RUN useradd -m -s /bin/bash admin && \
    echo 'admin:admin' | chpasswd && \
    echo 'root:root' | chpasswd

# Install monitoring
COPY monitor.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/monitor.sh

# Start services
CMD service ssh start && \
    service openbsd-inetd start && \
    /usr/local/bin/monitor.sh
```

**Monitoring script (monitor.sh):**
```bash
#!/bin/bash
# Log all activity for analysis

LOG_DIR=/var/log/honeypot
mkdir -p $LOG_DIR

# Monitor all connections
tcpdump -i any -w $LOG_DIR/traffic_$(date +%Y%m%d_%H%M%S).pcap &

# Monitor process execution
while true; do
    ps aux | grep -v grep | grep -E "(wget|curl|tftp|nc)" >> $LOG_DIR/suspicious_processes.log
    
    # Log new connections
    netstat -an | grep ESTABLISHED >> $LOG_DIR/connections.log
    
    sleep 5
done
```

### 5.3 High-Interaction Honeypot (Full System)

**Using actual IoT devices with monitoring:**

```bash
# Set up isolated test network
# 192.168.99.0/24 - Honeypot network (no Internet)

# Router configuration
iptables -A FORWARD -s 192.168.99.0/24 -j DROP  # Block outbound
iptables -A FORWARD -d 192.168.99.0/24 -j ACCEPT  # Allow inbound

# Deploy actual vulnerable devices
# - Old IP cameras with default creds
# - Routers with telnet enabled
# - DVRs with known vulnerabilities

# Central logging server
rsyslog -c /etc/rsyslog.d/honeypot.conf
```

### 5.4 Data Collection & Analysis

**Automated analysis pipeline:**
```python
#!/usr/bin/env python3
"""
Analyze honeypot logs to extract threat intelligence
"""
import json
import re
from collections import Counter

def analyze_cowrie_logs(logfile):
    """Extract credentials, commands, malware URLs"""
    credentials = []
    commands = []
    downloads = []
    
    with open(logfile) as f:
        for line in f:
            try:
                event = json.loads(line)
                
                # Credential attempts
                if event['eventid'] == 'cowrie.login.failed':
                    credentials.append({
                        'username': event['username'],
                        'password': event['password'],
                        'src_ip': event['src_ip']
                    })
                
                # Commands executed
                elif event['eventid'] == 'cowrie.command.input':
                    commands.append(event['input'])
                
                # Malware downloads
                elif event['eventid'] == 'cowrie.session.file_download':
                    downloads.append({
                        'url': event['url'],
                        'shasum': event['shasum'],
                        'outfile': event['outfile']
                    })
                    
            except Exception as e:
                continue
    
    # Generate statistics
    print(f"[+] Total login attempts: {len(credentials)}")
    print(f"[+] Unique credentials: {len(set((c['username'], c['password']) for c in credentials))}")
    print(f"[+] Commands executed: {len(commands)}")
    print(f"[+] Malware samples: {len(downloads)}")
    
    # Top credentials
    print("\n[+] Top 10 credentials:")
    cred_counter = Counter((c['username'], c['password']) for c in credentials)
    for (user, passwd), count in cred_counter.most_common(10):
        print(f"    {user}:{passwd} - {count} attempts")
    
    # Top commands
    print("\n[+] Top 10 commands:")
    cmd_counter = Counter(commands)
    for cmd, count in cmd_counter.most_common(10):
        print(f"    {cmd} - {count} times")
    
    return {
        'credentials': credentials,
        'commands': commands,
        'downloads': downloads
    }

# Usage
if __name__ == '__main__':
    analyze_cowrie_logs('/opt/cowrie/var/log/cowrie/cowrie.json')
```

### 5.5 Safety & Ethical Considerations

**⚠️ CRITICAL SAFETY RULES:**

1. **Network Isolation**
   - ✅ Honeypots MUST be isolated from production networks
   - ✅ No Internet access for infected systems
   - ✅ Use separate physical hardware or VLANs

2. **Legal Compliance**
   - ✅ Ensure you own/control the IP addresses
   - ✅ Don't deploy on shared networks without permission
   - ✅ Be aware of local laws regarding honeypots

3. **Data Handling**
   - ✅ Log everything (for research)
   - ✅ Encrypt stored logs
   - ✅ Don't share personally identifiable information (PII)

4. **Incident Response**
   - ✅ Have kill switch ready
   - ✅ Monitor for containment breaches
   - ✅ Automated alerts if honeypot attacks real systems

**Kill switch example:**
```bash
#!/bin/bash
# Emergency shutdown if honeypot is compromised

# Check if honeypot is attacking external IPs
if tcpdump -i eth0 -c 100 'src 192.168.99.0/24' | grep -v '192.168.99'; then
    echo "ALERT: Honeypot containment breach!"
    
    # Immediate shutdown
    iptables -F
    iptables -P INPUT DROP
    iptables -P OUTPUT DROP
    iptables -P FORWARD DROP
    
    # Notify admin
    mail -s "HONEYPOT BREACH" admin@example.com < /dev/null
    
    # Power off honeypot network
    poweroff
fi
```

### 5.6 Honeypot Deployment Checklist

**Pre-deployment:**
- [ ] Network isolation verified (no route to Internet)
- [ ] Legal approval obtained
- [ ] Monitoring systems in place
- [ ] Backup/restore procedures tested
- [ ] Kill switch configured and tested
- [ ] Alert systems configured

**During deployment:**
- [ ] Services started (telnet, SSH)
- [ ] Default credentials configured
- [ ] Traffic logging enabled (tcpdump, NetFlow)
- [ ] Database logging operational
- [ ] Dashboard monitoring active

**Post-deployment:**
- [ ] Daily log review
- [ ] Weekly analysis of captured data
- [ ] Monthly security audit
- [ ] Quarterly threat intelligence report

### 5.7 Research Applications

**Use honeypot data for:**

1. **Credential Intelligence**
   - Build database of common IoT credentials
   - Feed into ML models for prediction
   - Update detection signatures

2. **Malware Analysis**
   - Reverse engineer captured samples
   - Identify new attack techniques
   - Develop detection signatures

3. **Attack Pattern Recognition**
   - Understand botnet lifecycle
   - Map C&C infrastructure
   - Predict future attacks

4. **Defense Testing**
   - Validate detection methods
   - Test IDS/IPS rules
   - Benchmark security tools

**Sample research workflow:**
```
Day 1-7:   Deploy honeypot, collect data
Day 8-14:  Analyze patterns, extract samples
Day 15-21: Reverse engineer malware
Day 22-28: Develop detection signatures
Day 29-30: Publish findings, update defenses
```

---

## Incident Response Checklist

### Detection Phase
- [ ] Alert triggered and verified
- [ ] Scope of infection determined
- [ ] C&C infrastructure identified

### Containment Phase
- [ ] Infected devices isolated
- [ ] C&C blocked at firewall
- [ ] Scanning activity blocked

### Eradication Phase
- [ ] Malware removed from devices
- [ ] Credentials changed
- [ ] Firmware updated
- [ ] Vulnerabilities patched

### Recovery Phase
- [ ] Devices restored to normal operation
- [ ] Monitoring increased
- [ ] Post-incident review completed

### Lessons Learned
- [ ] Root cause identified
- [ ] Defense improvements implemented
- [ ] Documentation updated

---

## Long-Term Strategy

### 1. Zero Trust Architecture
- Assume breach
- Verify everything
- Least privilege access

### 2. Continuous Monitoring
```bash
# Example: Real-time dashboard
while true; do
    echo "=== IoT Security Status ==="
    echo "Devices online: $(arp-scan --localnet | wc -l)"
    echo "Failed logins (1h): $(grep 'Failed password' /var/log/auth.log | wc -l)"
    echo "Active connections: $(netstat -an | grep ESTABLISHED | wc -l)"
    sleep 300
done
```

### 3. Regular Security Audits
- Penetration testing
- Vulnerability scanning
- Configuration reviews

---

## Summary

**Key Takeaways:**

1. **No Default Credentials** - This alone prevents 90% of IoT botnet infections
2. **Network Segmentation** - Limits damage if device is compromised
3. **Monitoring** - Early detection enables rapid response
4. **Automation** - Scale requires automated defense

**Defense Priorities:**
1. 🔴 **Critical**: Change default credentials
2. 🟠 **High**: Disable telnet, enable SSH with keys
3. 🟡 **Medium**: Network segmentation, IDS deployment
4. 🟢 **Low**: Advanced monitoring, SOAR automation

---

**Remember:** Security is a process, not a product. Continuous vigilance required.

**Related Documents:**
- `DETECTION_METHODS.md` - How to detect these techniques
- `ETHICAL_USAGE.md` - Responsible research guidelines
- `STEALTH_AND_SCALE_IMPLEMENTATION.md` - Technical implementation details

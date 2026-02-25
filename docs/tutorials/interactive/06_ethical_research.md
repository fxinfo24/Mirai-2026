# Tutorial 06: Ethical Security Research with Mirai 2026

> **Duration:** 90 minutes  
> **Level:** Intermediate  
> **Prerequisites:** Tutorials 01-05, Ethics training  
> **Objective:** Learn to conduct authorized, ethical security research

---

## 🎯 Learning Objectives

By the end of this tutorial, you will:
- Understand legal and ethical requirements for security research
- Configure and use kill switches for safety
- Implement authorization frameworks
- Deploy honeypots in isolated environments
- Analyze attack data responsibly
- Practice responsible vulnerability disclosure

---

## ⚠️ CRITICAL: Ethics First

**Before starting this tutorial:**
- [ ] Read `docs/research/ETHICAL_USAGE.md` completely
- [ ] Complete ethics training certification
- [ ] Obtain written authorization from supervisor
- [ ] Verify network isolation
- [ ] Sign research agreement

**NEVER proceed without authorization!**

---

## Part 1: Authorization Setup (15 minutes)

### Step 1.1: Create Authorization Token

Generate a unique authorization token for your research:

```bash
# Generate UUID token
uuidgen
# Output: 550e8400-e29b-41d4-a716-446655440000
```

### Step 1.2: Configure Authorization

Create your authorization file:

```bash
cd ~/Mirai-2026
cp config/authorization.example.json config/authorization.json
nano config/authorization.json
```

Edit with your research details:

```json
{
  "token": "YOUR-UUID-HERE",
  "issued_at": "2026-02-25T10:00:00Z",
  "expires_at": "2026-03-25T10:00:00Z",
  "researcher_id": "your.email@university.edu",
  "project_id": "IoT-Security-Research-2026",
  "authorized_operations": [
    "scan:local_network",
    "honeypot:deploy",
    "honeypot:monitor",
    "analysis:passive",
    "data:collection"
  ],
  "network_restrictions": [
    "192.168.100.0/24"
  ],
  "max_runtime_hours": 24
}
```

**Key fields:**
- `token`: Your unique UUID
- `expires_at`: Set expiration date (max 90 days)
- `researcher_id`: Your institutional email
- `project_id`: Your research project name
- `authorized_operations`: Only operations you're authorized for
- `network_restrictions`: ONLY your isolated lab network
- `max_runtime_hours`: Automatic shutdown time (recommended: 24)

### Step 1.3: Test Authorization

```bash
# Build with authorization support
make debug

# Test authorization verification
./build/debug/bin/auth_test config/authorization.json
```

Expected output:
```
[INFO] Authorization verified: your.email@university.edu/IoT-Security-Research-2026
[INFO] Token expires in: 720 hours
[INFO] Authorized operations: 5
[INFO] Network restrictions: 1
```

---

## Part 2: Kill Switch Configuration (15 minutes)

### Step 2.1: Remote Kill Switch

Set up a remote kill switch server:

```python
# kill_switch_server.py
from flask import Flask, jsonify
import os

app = Flask(__name__)

# Kill switch state (file-based)
KILL_SWITCH_FILE = "/tmp/killswitch.state"

@app.route('/killswitch')
def check_killswitch():
    """Return 200 OK if safe to continue, 503 to terminate"""
    if os.path.exists(KILL_SWITCH_FILE):
        return jsonify({"status": "TERMINATED"}), 503
    return jsonify({"status": "OK"}), 200

@app.route('/killswitch/activate', methods=['POST'])
def activate_killswitch():
    """Emergency kill switch activation"""
    with open(KILL_SWITCH_FILE, 'w') as f:
        f.write("ACTIVATED")
    return jsonify({"status": "KILL SWITCH ACTIVATED"}), 200

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
```

Run the kill switch server:

```bash
python3 kill_switch_server.py &
```

### Step 2.2: Configure Kill Switch in Code

Edit your bot configuration to include kill switch:

```json
{
  "kill_switch": {
    "enabled": true,
    "remote_url": "http://127.0.0.1:5000/killswitch",
    "check_interval_seconds": 60,
    "max_runtime_seconds": 86400
  }
}
```

### Step 2.3: Test Kill Switch

```bash
# Start test program with kill switch
./build/debug/bin/bot_test --config config/bot.json

# In another terminal, activate kill switch
curl -X POST http://127.0.0.1:5000/killswitch/activate

# Observe: Program should terminate within 60 seconds
```

Expected output:
```
[INFO] Kill switch initialized: url=http://127.0.0.1:5000/killswitch, interval=60
[INFO] Starting main loop...
[WARN] Kill switch activated: HTTP 503
[INFO] Kill switch triggered - shutting down
[INFO] Cleanup complete
```

### Step 2.4: Manual Kill Switch Test

```bash
# Start program
./build/debug/bin/bot_test --config config/bot.json &
BOT_PID=$!

# Trigger manual kill switch
kill -USR1 $BOT_PID

# Observe: Immediate termination
```

---

## Part 3: Honeypot Deployment (30 minutes)

### Step 3.1: Network Isolation Verification

**CRITICAL: Verify network isolation before deploying honeypot**

```bash
# Check current network
ip addr show

# Verify no Internet access from honeypot network
ping -c 3 8.8.8.8
# Should FAIL if properly isolated

# Check iptables rules
sudo iptables -L -n -v
```

Expected: Honeypot network (192.168.100.0/24) should have NO route to Internet.

### Step 3.2: Deploy Cowrie Honeypot

```bash
cd ~/Mirai-2026/tests/honeypot
./deploy_cowrie.sh
```

Follow the prompts:
1. Dependencies will be installed
2. Cowrie will be cloned
3. Virtual environment created
4. Configuration generated
5. Choose whether to forward ports (recommended: No for first test)

### Step 3.3: Verify Honeypot

```bash
# Check Cowrie status
~/cowrie-honeypot/bin/cowrie status

# Expected: "cowrie is running (PID: XXXXX)"
```

Test honeypot accessibility:

```bash
# SSH test (from isolated network only!)
ssh -p 2222 root@localhost
# Try credentials: root:root

# Telnet test
telnet localhost 2323
# Try credentials: admin:admin
```

### Step 3.4: Monitor Honeypot Logs

```bash
# Real-time log monitoring
tail -f ~/cowrie-honeypot/var/log/cowrie/cowrie.log
```

---

## Part 4: Safe Research Execution (20 minutes)

### Step 4.1: Pre-Flight Checklist

Before starting ANY research:

```bash
# Run pre-flight check script
./scripts/preflight_check.sh
```

Expected checks:
- [ ] Authorization valid and not expired
- [ ] Kill switches configured and tested
- [ ] Network isolation verified
- [ ] Audit logging enabled
- [ ] Honeypot accessible
- [ ] Monitoring dashboard running

### Step 4.2: Execute Safe Scan

Run a controlled scan of your isolated network:

```bash
# Scan ONLY authorized network
./build/debug/bin/scanner \
  --target 192.168.100.0/24 \
  --auth config/authorization.json \
  --max-runtime 3600 \
  --audit-log /var/log/mirai2026/audit.log
```

Expected behavior:
- Authorization checked on startup
- Network restriction enforced (only scans 192.168.100.0/24)
- Audit log created
- Kill switch checked every 60 seconds
- Automatic termination after 1 hour (3600 seconds)

### Step 4.3: Monitor Research Activity

In separate terminals:

```bash
# Terminal 1: Watch audit logs
tail -f /var/log/mirai2026/audit.log | jq .

# Terminal 2: Monitor honeypot
tail -f ~/cowrie-honeypot/var/log/cowrie/cowrie.log

# Terminal 3: System monitoring
htop
```

---

## Part 5: Data Analysis (20 minutes)

### Step 5.1: Collect Honeypot Data

After running research for 30+ minutes:

```bash
# Analyze honeypot logs
python3 ~/Mirai-2026/ai/analyze_honeypot_logs.py \
  ~/cowrie-honeypot/var/log/cowrie/cowrie.json
```

Expected output:
```
HONEYPOT ANALYSIS SUMMARY
=========================================================
Total login attempts:     147
Successful logins:        12
Unique credentials:       23
Commands executed:        89
Malware downloads:        3
Unique attack IPs:        5
```

### Step 5.2: Review Audit Trail

```bash
# Parse audit logs
cat /var/log/mirai2026/audit.log | jq -r '. | "\(.timestamp) \(.event) \(.details)"'
```

Look for:
- STARTUP event (program started)
- AUTH_SUCCESS (authorization verified)
- SCAN_START (scanning began)
- DEVICE_FOUND (devices discovered)
- CREDENTIAL_ATTEMPT (credentials tested)
- SHUTDOWN (program terminated)

### Step 5.3: Generate Threat Intelligence

Extract IoCs (Indicators of Compromise):

```bash
# Extract malicious IPs
cat /var/log/mirai2026/audit.log | jq -r 'select(.event=="CREDENTIAL_ATTEMPT") | .target' | sort -u

# Extract successful credentials
cat ~/cowrie-honeypot/var/log/cowrie/cowrie.json | \
  jq -r 'select(.eventid=="cowrie.login.success") | "\(.username):\(.password)"' | \
  sort | uniq -c | sort -rn
```

---

## Part 6: Responsible Disclosure (10 minutes)

### Step 6.1: Vulnerability Documentation

If you discover a vulnerability during research:

```markdown
# Vulnerability Report Template

**Date:** 2026-02-25
**Researcher:** Your Name (your.email@university.edu)
**Project:** IoT-Security-Research-2026

## Vulnerability Summary
- **Affected Product:** [Vendor/Model]
- **Vulnerability Type:** [e.g., Default Credentials]
- **Severity:** [Critical/High/Medium/Low]
- **CVSSv3 Score:** [X.X]

## Discovery Method
Discovered during authorized security research in isolated lab environment
using Mirai 2026 platform under university ethics approval #XXXXX.

## Technical Details
[Describe vulnerability without providing exploit code]

## Impact
[Describe potential impact if exploited]

## Recommended Fix
[Suggest remediation steps]

## Disclosure Timeline
- Day 0: Private disclosure to vendor
- Day 7: Confirm receipt
- Day 30: Request status update
- Day 90: Public disclosure (if not fixed)

## Contact
[Your contact information]
```

### Step 6.2: Vendor Notification

```bash
# Use responsible disclosure template
cat docs/research/ETHICAL_USAGE.md | grep -A 30 "Vulnerability Disclosure"
```

**Key points:**
- Notify vendor privately FIRST
- Give reasonable time to fix (90 days)
- Coordinate public disclosure
- Do NOT publish exploit code
- Focus on improving security

---

## Part 7: Cleanup & Decommissioning (10 minutes)

### Step 7.1: Stop All Services

```bash
# Stop honeypot
~/cowrie-honeypot/bin/cowrie stop

# Stop kill switch server
pkill -f kill_switch_server.py

# Stop any running scanners
pkill -f scanner
```

### Step 7.2: Secure Data Deletion

```bash
# Archive audit logs (if required)
tar -czf research_archive_$(date +%Y%m%d).tar.gz \
  /var/log/mirai2026/audit.log \
  ~/cowrie-honeypot/var/log/cowrie/cowrie.json

# Encrypt archive
gpg -c research_archive_$(date +%Y%m%d).tar.gz

# Securely delete originals
shred -vfz -n 7 /var/log/mirai2026/audit.log
shred -vfz -n 7 ~/cowrie-honeypot/var/log/cowrie/cowrie.json
```

### Step 7.3: Final Checklist

- [ ] All services stopped
- [ ] Audit logs archived (if required) or securely deleted
- [ ] Honeypot decommissioned
- [ ] Network isolation rules removed (if temporary)
- [ ] Final report submitted
- [ ] Ethics board notified of completion
- [ ] Authorization token revoked

---

## 🎓 Quiz: Ethical Research

Test your understanding:

1. **What must you obtain BEFORE starting security research?**
   - [ ] A. New hardware
   - [ ] B. Written authorization
   - [ ] C. More coffee
   - [ ] D. Expensive tools
   
   <details><summary>Answer</summary>B. Written authorization is MANDATORY</details>

2. **How often should the kill switch check the remote server?**
   - [ ] A. Every second
   - [ ] B. Once per day
   - [ ] C. Every 60 seconds (recommended)
   - [ ] D. Never
   
   <details><summary>Answer</summary>C. Every 60 seconds balances safety and performance</details>

3. **What should you do if you discover a vulnerability?**
   - [ ] A. Post exploit on Twitter immediately
   - [ ] B. Notify vendor privately, allow 90 days to fix
   - [ ] C. Sell to highest bidder
   - [ ] D. Ignore it
   
   <details><summary>Answer</summary>B. Responsible disclosure protects everyone</details>

4. **Where should honeypots be deployed?**
   - [ ] A. Isolated networks with NO Internet access
   - [ ] B. Production networks
   - [ ] C. Cloud servers with public IPs
   - [ ] D. Friend's networks without permission
   
   <details><summary>Answer</summary>A. Isolation prevents containment breaches</details>

5. **Maximum recommended runtime for research session?**
   - [ ] A. Forever
   - [ ] B. 24 hours
   - [ ] C. 1 minute
   - [ ] D. Until caught
   
   <details><summary>Answer</summary>B. 24 hours with auto-termination is safe</details>

---

## 📚 Additional Resources

**Documentation:**
- [ETHICAL_USAGE.md](../../research/ETHICAL_USAGE.md) - Complete ethical guidelines
- [COUNTERMEASURES.md](../../research/COUNTERMEASURES.md) - Honeypot deployment guide
- [DETECTION_METHODS.md](../../research/DETECTION_METHODS.md) - Detection techniques

**Legal Resources:**
- [CFAA - 18 U.S.C. § 1030](https://www.law.cornell.edu/uscode/text/18/1030)
- [ACM Code of Ethics](https://www.acm.org/code-of-ethics)
- [CERT Vulnerability Disclosure](https://vuls.cert.org/confluence/display/CVD)

**Tools:**
- Kill switch server: `ai/kill_switch_server.py`
- Honeypot analyzer: `ai/analyze_honeypot_logs.py`
- Cowrie deployment: `tests/honeypot/deploy_cowrie.sh`

---

## ✅ Completion Checklist

You have completed this tutorial when:

- [ ] Authorization system configured and tested
- [ ] Kill switches (remote, time-based, manual) working
- [ ] Honeypot deployed in isolated environment
- [ ] Safe research scan executed successfully
- [ ] Audit logs generated and reviewed
- [ ] Honeypot data analyzed
- [ ] All services properly decommissioned
- [ ] Data securely deleted or archived
- [ ] Quiz completed with 100% score
- [ ] Ethics certification obtained

---

## 🎯 Next Steps

**Continue learning:**
- [Tutorial 07: Advanced Detection Lab](07_detection_lab.md)
- [Tutorial 08: Threat Intelligence](08_threat_intelligence.md)
- [Research Paper: Detection Methodology](../../research/METHODOLOGY.md)

**Real-world application:**
- Propose your own research project
- Submit ethics board application
- Conduct authorized research
- Publish findings responsibly
- Contribute to IoT security

---

**Remember:** With great power comes great responsibility. Use your skills to make the Internet safer for everyone.

**Last Updated:** 2026-02-25  
**Maintainer:** Mirai 2026 Project Team

# Ethical Usage Guidelines - Mirai 2026

> **Purpose:** Ensure responsible and legal use of this security research platform
>
> **Audience:** Security researchers, academic institutions, penetration testers
>
> **Last Updated:** 2026-02-25
>
> **⚠️ CRITICAL:** This document outlines mandatory ethical and legal requirements for using Mirai 2026.

---

## ⚖️ Legal Notice

### THIS SOFTWARE IS FOR AUTHORIZED RESEARCH ONLY

**Mirai 2026 is a security research and educational platform.** Unauthorized use of this software may violate:

- **Computer Fraud and Abuse Act (CFAA)** - United States
- **Computer Misuse Act** - United Kingdom
- **EU Cybercrime Directive**
- **Your local computer crime laws**

**Penalties may include:**
- Criminal prosecution
- Civil liability
- Fines up to $250,000 USD
- Prison sentences up to 10 years
- Permanent criminal record

---

## ✅ Authorized Use Cases

**LEGAL and ETHICAL uses:**

1. **Academic Research**
   - University security courses
   - Thesis/dissertation research
   - Published academic papers
   - Student training in controlled labs

2. **Professional Security Testing**
   - Authorized penetration testing (written permission required)
   - Red team exercises (pre-approved scope)
   - Security product development
   - Threat intelligence research

3. **Defensive Research**
   - Detection method development
   - Honeypot deployment (isolated networks)
   - Security tool development
   - Incident response training

4. **IoT Security Improvement**
   - Vulnerability assessment (own devices only)
   - Security control development
   - Hardening methodology research
   - Product security testing (authorized)

---

## ❌ PROHIBITED Activities

**ILLEGAL and UNETHICAL uses:**

- ❌ **Scanning networks you don't own or control**
- ❌ **DDoS attacks against any target**
- ❌ **Unauthorized access to devices**
- ❌ **Credential theft or harvesting**
- ❌ **Malware distribution**
- ❌ **Building production botnets**
- ❌ **Selling access to compromised devices**
- ❌ **Cyber warfare or terrorism**
- ❌ **Any activity without explicit written authorization**

---

## 📋 Authorization Requirements

### Before ANY Use

**1. Written Authorization**

All research must have documented authorization:

```markdown
# Research Authorization Template

**Project:** [Project Name]
**Researcher:** [Your Name]
**Institution:** [University/Company]
**Date:** [YYYY-MM-DD]

**Scope:**
- Network range: [e.g., 192.168.1.0/24 - isolated lab]
- Duration: [Start - End date]
- Purpose: [Academic research / Penetration testing]
- Devices: [List of authorized target devices]

**Approvals:**
- Research Supervisor: [Name, Signature, Date]
- Ethics Committee: [Approval #, Date]
- Network Administrator: [Name, Signature, Date]
- Legal Review: [Name, Signature, Date]

**Restrictions:**
- No Internet-facing deployment
- No unauthorized networks
- Data retention: [30 days maximum]
- Destruction method: [Secure deletion]
```

**2. Ethics Board Approval**

For academic research:
- IRB (Institutional Review Board) approval required
- Protocol must address privacy concerns
- Data handling procedures documented
- Risk assessment completed

**3. Network Isolation**

All testing must occur in isolated environments:
- ✅ Dedicated VLAN with no Internet access
- ✅ Air-gapped lab network
- ✅ Contained virtual network
- ❌ Never on production networks
- ❌ Never on shared infrastructure

**4. Signed Research Agreement**

Researchers must sign the following agreement:

```
MIRAI 2026 RESEARCH AGREEMENT

I, [Researcher Name], hereby agree to:

1. Use this software ONLY for authorized research purposes
2. Obtain written permission before any testing
3. Operate only in isolated, controlled environments
4. Never deploy on production or Internet-facing networks
5. Implement all required safety features (kill switches, authorization)
6. Log all activities for audit purposes
7. Report any vulnerabilities discovered responsibly
8. Destroy all research data after project completion
9. Not distribute or share this software without permission
10. Accept full legal responsibility for my actions

I understand that violation of this agreement may result in:
- Criminal prosecution
- Civil liability
- Academic sanctions
- Professional consequences

Signature: _________________ Date: _________
Witness: ___________________ Date: _________
```

---

## 🛡️ Mandatory Safety Features

### 1. Kill Switch Implementation

**All components MUST implement kill switches.**

#### Remote Kill Switch

**Purpose:** Emergency shutdown from central command

**Implementation:**

```c
// src/common/kill_switch.h

#ifndef KILL_SWITCH_H
#define KILL_SWITCH_H

#include <stdbool.h>
#include <time.h>

typedef struct {
    char *url;                    // Kill switch check URL
    int check_interval_seconds;   // How often to check (default: 60)
    bool enabled;                 // Kill switch active?
    time_t last_check;           // Last check timestamp
} kill_switch_t;

/**
 * Initialize kill switch
 * 
 * @param url URL to check for kill signal (must return 200 OK to continue)
 * @param interval Check interval in seconds
 * @return Initialized kill switch structure
 */
kill_switch_t *kill_switch_init(const char *url, int interval);

/**
 * Check if kill signal received
 * 
 * @param ks Kill switch instance
 * @return true if should terminate, false otherwise
 */
bool kill_switch_check(kill_switch_t *ks);

/**
 * Cleanup kill switch
 */
void kill_switch_destroy(kill_switch_t *ks);

#endif // KILL_SWITCH_H
```

**Usage:**

```c
// In main program
kill_switch_t *ks = kill_switch_init("https://research.example.com/killswitch", 60);

while (running) {
    // Check kill switch every iteration
    if (kill_switch_check(ks)) {
        log_info("Kill switch activated - shutting down");
        cleanup_and_exit();
    }
    
    // Do work...
}
```

#### Time-Based Kill Switch

**Purpose:** Auto-terminate after maximum runtime

```c
typedef struct {
    time_t start_time;
    time_t max_runtime_seconds;
    bool enabled;
} time_limit_t;

bool time_limit_exceeded(time_limit_t *tl) {
    if (!tl->enabled) return false;
    
    time_t now = time(NULL);
    time_t elapsed = now - tl->start_time;
    
    if (elapsed > tl->max_runtime_seconds) {
        log_warn("Maximum runtime exceeded: %ld seconds", elapsed);
        return true;
    }
    
    return false;
}
```

#### Manual Kill Switch

**Purpose:** Local emergency shutdown

```c
// Signal handler for SIGUSR1
void kill_switch_signal_handler(int signum) {
    if (signum == SIGUSR1) {
        log_info("Manual kill switch activated via SIGUSR1");
        cleanup_and_exit();
    }
}

// Usage: kill -USR1 <pid>
```

### 2. Authorization Framework

**All operations require authorization tokens.**

```c
// src/common/authorization.h

typedef struct {
    char *token;                 // Authorization token (UUID)
    time_t issued_at;           // When token was issued
    time_t expires_at;          // Token expiration
    char *researcher_id;        // Researcher identifier
    char *project_id;           // Project identifier
    bool require_auth;          // Enforce authorization?
} auth_config_t;

/**
 * Initialize authorization system
 */
auth_config_t *auth_init(const char *token_file);

/**
 * Verify authorization is valid
 * 
 * @return true if authorized, false otherwise
 */
bool auth_verify(auth_config_t *auth);

/**
 * Check if operation is authorized
 * 
 * @param operation Operation identifier (e.g., "scan", "attack")
 * @return true if authorized, false otherwise
 */
bool auth_check_operation(auth_config_t *auth, const char *operation);
```

**Token Format (JSON):**

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "issued_at": "2026-02-25T10:00:00Z",
  "expires_at": "2026-03-25T10:00:00Z",
  "researcher_id": "researcher@university.edu",
  "project_id": "IoT-Security-Research-2026",
  "authorized_operations": [
    "scan:local_network",
    "honeypot:deploy",
    "analysis:passive"
  ],
  "network_restrictions": [
    "192.168.100.0/24"
  ],
  "max_runtime_hours": 24
}
```

### 3. Audit Logging

**All actions must be logged for accountability.**

```c
// src/common/audit_log.h

typedef enum {
    AUDIT_STARTUP,
    AUDIT_SHUTDOWN,
    AUDIT_SCAN_START,
    AUDIT_SCAN_STOP,
    AUDIT_CREDENTIAL_ATTEMPT,
    AUDIT_DEVICE_COMPROMISED,
    AUDIT_ATTACK_LAUNCHED,
    AUDIT_KILL_SWITCH_ACTIVATED,
    AUDIT_AUTH_FAILURE
} audit_event_t;

/**
 * Log auditable event
 */
void audit_log(audit_event_t event, const char *details);
```

**Log Format:**

```json
{
  "timestamp": "2026-02-25T10:15:30Z",
  "event": "SCAN_START",
  "researcher_id": "researcher@university.edu",
  "project_id": "IoT-Security-Research-2026",
  "target": "192.168.100.50",
  "details": "Initiated telnet scan with 10 credentials",
  "authorization_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Audit log location:** `/var/log/mirai2026/audit.log` (append-only, tamper-evident)

### 4. Network Restrictions

**Prevent accidental or malicious use on unauthorized networks.**

```c
// src/common/network_restrictions.h

typedef struct {
    char **allowed_networks;     // CIDR notation (e.g., "192.168.1.0/24")
    int num_networks;
    bool restrict_enabled;
} network_restrictions_t;

/**
 * Check if target IP is in authorized network range
 */
bool network_is_authorized(network_restrictions_t *nr, const char *target_ip);
```

**Configuration Example:**

```ini
[network_restrictions]
enabled = true
allowed_networks = 192.168.100.0/24, 10.0.0.0/8
blocked_networks = 0.0.0.0/0  # Block everything by default
```

---

## 📊 Monitoring & Compliance

### Real-Time Monitoring

**Supervisors must have visibility into research activities.**

**Monitoring Dashboard:**
- Real-time activity feed
- Active scans/attacks
- Compromised device count
- Authorization status
- Kill switch status

**Implementation:**

```python
# ai/monitoring_dashboard.py

from flask import Flask, render_template
import json

app = Flask(__name__)

@app.route('/status')
def research_status():
    """Real-time research activity status"""
    return {
        "authorized": True,
        "kill_switch_active": False,
        "active_scans": 3,
        "devices_found": 15,
        "credentials_tested": 120,
        "runtime_minutes": 45,
        "max_runtime_minutes": 1440,  # 24 hours
        "researcher": "researcher@university.edu",
        "last_activity": "2026-02-25T10:15:30Z"
    }

@app.route('/killswitch', methods=['POST'])
def activate_killswitch():
    """Emergency kill switch endpoint"""
    # Activate kill switch
    activate_global_killswitch()
    return {"status": "KILL SWITCH ACTIVATED"}
```

### Compliance Checklist

**Before starting research:**

- [ ] Written authorization obtained
- [ ] Ethics board approval received
- [ ] Network isolation verified
- [ ] Authorization token generated
- [ ] Kill switches configured
- [ ] Audit logging enabled
- [ ] Monitoring dashboard accessible
- [ ] Emergency contact list prepared
- [ ] Data retention policy documented
- [ ] Destruction procedure defined

**During research:**

- [ ] Monitor dashboard regularly
- [ ] Review audit logs daily
- [ ] Check authorization expiration
- [ ] Verify network isolation
- [ ] Test kill switch functionality
- [ ] Document all findings
- [ ] Report incidents immediately

**After research:**

- [ ] Decommission all infrastructure
- [ ] Destroy collected data securely
- [ ] Archive audit logs (as required)
- [ ] Submit final report
- [ ] Update detection signatures
- [ ] Publish findings responsibly
- [ ] Notify affected parties (if any)

---

## 🔒 Data Handling & Privacy

### Data Minimization

**Collect only necessary data:**
- ✅ IP addresses (pseudonymized)
- ✅ Credential attempt logs
- ✅ Network traffic metadata
- ❌ Personal information
- ❌ Sensitive content from devices
- ❌ Private communications

### Data Retention

**Maximum retention period: 90 days**

```bash
# Automated data destruction
0 0 * * * find /var/log/mirai2026 -mtime +90 -delete
```

### Secure Deletion

```bash
# Shred log files before deletion
shred -vfz -n 7 /var/log/mirai2026/*.log

# Wipe database
psql -c "DROP DATABASE mirai_research; CREATE DATABASE mirai_research;"

# Clear file system
dd if=/dev/zero of=/dev/sdX bs=1M  # Use with caution!
```

---

## 🚨 Incident Response

### If Unauthorized Activity Detected

**Immediate actions:**

1. **ACTIVATE KILL SWITCH**
   ```bash
   curl -X POST https://research.example.com/killswitch
   # OR
   kill -USR1 $(pgrep -f mirai)
   ```

2. **Isolate Systems**
   ```bash
   # Cut network access
   iptables -P INPUT DROP
   iptables -P OUTPUT DROP
   iptables -P FORWARD DROP
   ```

3. **Preserve Evidence**
   ```bash
   # Snapshot audit logs
   cp -r /var/log/mirai2026 /secure/evidence/$(date +%Y%m%d_%H%M%S)
   
   # Capture memory
   memdump > /secure/evidence/memory_$(date +%Y%m%d_%H%M%S).raw
   ```

4. **Notify Authorities**
   - Research supervisor
   - Network security team
   - Ethics board
   - Legal counsel
   - Law enforcement (if applicable)

### Vulnerability Disclosure

**If vulnerabilities discovered:**

1. **Responsible Disclosure Timeline:**
   - Day 0: Notify vendor privately
   - Day 7: Confirm vendor received notice
   - Day 30: Request status update
   - Day 90: Public disclosure (if not fixed)

2. **CVE Process:**
   - Request CVE identifier
   - Coordinate with vendor
   - Publish advisory with fixes

3. **Notification Template:**
   ```markdown
   Subject: Security Vulnerability Report - [Product Name]
   
   Dear [Vendor] Security Team,
   
   I am a security researcher at [Institution] conducting authorized
   research on IoT security. I have discovered a vulnerability in
   [Product Name] during controlled testing.
   
   **Vulnerability Details:**
   - Type: [e.g., Default credentials]
   - Severity: [Critical/High/Medium/Low]
   - Affected versions: [List]
   - CVSSv3 Score: [X.X]
   
   **Proof of Concept:**
   [Responsible disclosure - no exploit code]
   
   **Proposed Fix:**
   [Recommendations]
   
   **Disclosure Timeline:**
   I plan to publicly disclose this vulnerability in 90 days
   (by [DATE]) to allow time for remediation.
   
   Please acknowledge receipt and provide a remediation timeline.
   
   Best regards,
   [Your Name]
   [Institution]
   [Contact Info]
   ```

---

## 🎓 Educational Exemptions

### Academic Research

**Acceptable under specific conditions:**

**Requirements:**
- University/institution affiliation
- Faculty supervision required
- Ethics board approval mandatory
- Published research encouraged
- Open-source contributions welcome

**Example Research Projects:**
- Botnet detection algorithm development
- IoT security improvement methodologies
- Machine learning for threat detection
- Honeypot data analysis
- Defensive tool development

### Student Training

**Supervised coursework only:**

```markdown
# Course: CS 599 - IoT Security Research
# Instructor: Dr. Jane Smith
# Semester: Spring 2026

**Lab Exercise: Honeypot Deployment**

Objective: Deploy Cowrie honeypot and analyze attack patterns

Prerequisites:
- Signed research agreement
- Completed ethics training
- Isolated lab network access

Safety Measures:
- Network isolation verified by TA
- Kill switch configured
- Audit logging enabled
- 2-hour time limit
- Supervisor monitoring required
```

---

## ⚖️ Legal Compliance by Jurisdiction

### United States

**Computer Fraud and Abuse Act (CFAA) - 18 U.S.C. § 1030**

**Authorized research is legal if:**
- Written permission obtained
- No damage to systems
- No unauthorized access
- Good faith security research

**Safe harbor provisions:**
- DMCA Section 1201(j) - Security research exemption
- CFAA research exception (as of 2021 amendment)

### European Union

**EU Cybercrime Directive (2013/40/EU)**

**Requirements:**
- Legitimate purpose
- Proportionate means
- No intent to cause damage
- Authorization documented

**GDPR Compliance:**
- Data minimization
- Purpose limitation
- Storage limitation
- Pseudonymization required

### United Kingdom

**Computer Misuse Act 1990**

**Section 1 exemptions:**
- Authorized access
- Lawful testing
- Security research

**Requirements:**
- Written authorization
- Reasonable belief of authorization
- No malicious intent

---

## 📞 Emergency Contacts

### Research Emergency Hotline

**Security Incident:** research-security@institution.edu  
**Ethics Violation:** ethics-board@institution.edu  
**Legal Issues:** legal@institution.edu  
**Technical Support:** research-support@institution.edu

**Emergency Kill Switch:** https://research.example.com/killswitch  
**24/7 Hotline:** +1-555-RESEARCH

---

## 📚 Required Training

**Before using this platform, complete:**

1. **Ethics in Security Research** (4 hours)
   - Responsible disclosure
   - Legal compliance
   - Privacy protection

2. **Mirai 2026 Safety Training** (2 hours)
   - Kill switch operation
   - Authorization system
   - Audit logging
   - Network restrictions

3. **Incident Response** (2 hours)
   - Emergency procedures
   - Evidence preservation
   - Reporting requirements

**Certification required:** Pass 80% on final exam

---

## ✅ Pre-Deployment Checklist

**Complete before ANY deployment:**

```markdown
## Authorization
- [ ] Written authorization signed
- [ ] Ethics board approval received
- [ ] Network owner permission documented
- [ ] Legal review completed
- [ ] Research agreement signed

## Technical Safety
- [ ] Network isolation verified (no Internet access)
- [ ] Kill switches configured and tested
- [ ] Authorization system enabled
- [ ] Audit logging operational
- [ ] Network restrictions configured
- [ ] Time limits set (max 24 hours)

## Monitoring
- [ ] Monitoring dashboard accessible
- [ ] Supervisor has access
- [ ] Alerts configured
- [ ] Emergency contacts verified
- [ ] Kill switch URL tested

## Data Handling
- [ ] Data retention policy documented
- [ ] Secure deletion procedure defined
- [ ] Privacy impact assessment completed
- [ ] Encryption enabled for storage

## Compliance
- [ ] All training completed
- [ ] Insurance verified
- [ ] Incident response plan ready
- [ ] Vulnerability disclosure process understood
```

---

## 🎯 Summary: Ethical Research Principles

1. **Authorization First** - Never operate without written permission
2. **Network Isolation** - Always use isolated, controlled environments
3. **Kill Switches** - Implement multiple fail-safe mechanisms
4. **Audit Everything** - Log all activities for accountability
5. **Privacy Protection** - Minimize data collection, respect privacy
6. **Responsible Disclosure** - Report vulnerabilities ethically
7. **Good Faith** - Act in the interest of improving security
8. **Transparency** - Document and publish findings openly

---

## 📖 References

**Legal Resources:**
- [CFAA - 18 U.S.C. § 1030](https://www.law.cornell.edu/uscode/text/18/1030)
- [EU Cybercrime Directive](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32013L0040)
- [UK Computer Misuse Act](https://www.legislation.gov.uk/ukpga/1990/18)

**Ethical Guidelines:**
- [ACM Code of Ethics](https://www.acm.org/code-of-ethics)
- [IEEE Ethics](https://www.ieee.org/about/corporate/governance/p7-8.html)
- [NCSA Security Research Guidelines](https://www.ncsa.uiuc.edu/)

**Responsible Disclosure:**
- [CERT Guide to Coordinated Vulnerability Disclosure](https://vuls.cert.org/confluence/display/CVD)
- [ISO 29147 - Vulnerability Disclosure](https://www.iso.org/standard/72311.html)

---

**Last Updated:** 2026-02-25  
**Version:** 1.0  
**Maintained By:** Mirai 2026 Project Team

---

**By using this software, you acknowledge that you have read, understood, and agree to abide by these ethical usage guidelines. Violation of these guidelines may result in criminal prosecution, civil liability, and academic/professional sanctions.**

**Use responsibly. Research ethically. Improve security for everyone.**

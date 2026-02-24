# Tutorial Update Plan - Post Dashboard Enhancement

**Date:** 2026-02-25  
**Status:** Required Updates Identified

---

## 🔴 Critical Updates Needed

### 1. Port Numbers - EVERYWHERE ❌

**Current (Outdated):**
- AI Service: Port 5000 ❌
- Grafana: Port 3000 ❌
- Prometheus: Port 9091 ❌
- Dashboard: Not mentioned ❌

**Actual (After Our Changes):**
- AI Service: Port **8001** ✅
- Grafana: Port **3010** ✅
- Prometheus: Port **9090** ✅
- Dashboard: Port **3003** ✅
- C&C API: Port **8080** ✅

**Files Affected:**
- ✅ `01_getting_started.md` - Multiple port references
- ✅ `02_detection_evasion.md` - Grafana/Prometheus URLs
- ✅ `03_training_rl_agent.md` - API endpoints
- ✅ `04_llm_integration.md` - LLM service ports
- ✅ `TUTORIAL.md` - All example commands
- ✅ `live_demo/README.md` - Sandbox URLs

---

### 2. LLM Integration Tutorial - OUTDATED ❌

**File:** `04_llm_integration.md`

**Current Issues:**
- Created as placeholder (empty/minimal content)
- No OpenRouter integration mentioned
- Missing actual API key configuration
- No examples of GPT-3.5 usage

**Needs:**
- ✅ OpenRouter setup instructions
- ✅ API key configuration (`ai/llm_integration/.env`)
- ✅ Real credential generation examples
- ✅ GPT-3.5 Turbo usage
- ✅ FREE model options (Llama2, Gemini, Mistral)
- ✅ Testing with actual LLM calls

---

### 3. Dashboard Tutorial - MISSING ❌

**Current State:**
- No tutorial for the new dashboard
- Terminal feature not documented
- Bot management features not covered
- Attack scheduling not explained

**Needs New Tutorial:**
`05_dashboard_features.md` covering:
- ✅ Dashboard access (port 3003)
- ✅ Interactive terminal usage
- ✅ Bot grouping and tagging
- ✅ Custom commands
- ✅ Automated recovery
- ✅ Attack scheduling
- ✅ AI predictions
- ✅ Notifications and webhooks

---

### 4. Getting Started Tutorial - INCOMPLETE ❌

**File:** `01_getting_started.md`

**Missing:**
- Dashboard setup and access
- OpenRouter API configuration
- New service endpoints
- Terminal interface usage
- Webhook configuration

**Needs Sections:**
- Step on dashboard first access
- LLM API key setup
- Service URL reference table
- Quick test commands for new features

---

### 5. Service URLs Reference - OUTDATED ❌

**Current "Useful URLs" sections are wrong:**

```markdown
# OUTDATED:
- AI Service: http://localhost:5000 ❌
- Prometheus: http://localhost:9091 ❌
- Grafana: http://localhost:3000 ❌

# CORRECT:
- Dashboard: http://localhost:3003 ✅
- Terminal: http://localhost:3003/test-terminal ✅
- AI Service: http://localhost:8001 ✅
- C&C API: http://localhost:8080 ✅
- Grafana: http://localhost:3010 ✅
- Prometheus: http://localhost:9090 ✅
- Jaeger: http://localhost:16686 ✅
```

---

## 📋 File-by-File Update Requirements

### `01_getting_started.md` 🔴 HIGH PRIORITY

**Line-by-line changes needed:**

| Line | Current | Should Be |
|------|---------|-----------|
| 78 | `0.0.0.0:3000->3000/tcp` | `0.0.0.0:3010->3000/tcp` |
| 85 | `http://localhost:5000/health` | `http://localhost:8001/health` |
| 90 | `http://localhost:9090/metrics` | `http://localhost:9090/metrics` (OK) |
| 93 | `http://localhost:3000` | `http://localhost:3010` |
| 163 | `http://localhost:5000/api/credentials` | `http://localhost:8001/generate-credentials` |
| 178 | `http://localhost:5000/api/evasion` | `http://localhost:8001/evasion-pattern` |
| 207 | `http://localhost:3000` | `http://localhost:3003` (Dashboard) |
| 338-341 | All URLs | Update to correct ports |

**New sections to add:**
1. **Dashboard Setup** (after Docker startup)
   - Access http://localhost:3003
   - Overview of dashboard features
   - Terminal access

2. **OpenRouter Configuration** (before AI testing)
   - Create `ai/llm_integration/.env`
   - Add API key
   - Choose model (GPT-3.5 or FREE options)

3. **Quick Test Suite**
   - Test dashboard: `open http://localhost:3003`
   - Test terminal: `open http://localhost:3003/test-terminal`
   - Test AI predictions
   - Test Grafana dashboards

---

### `02_detection_evasion.md` 🟡 MEDIUM PRIORITY

**Changes needed:**
- Line 87, 178, 193: Update AI service port (5000 → 8001)
- Line 232, 241: Update simulation endpoints
- Line 251: Grafana port (3000 → 3010)
- Line 303: Dashboard detection page URL

**New content:**
- How to view evasion metrics in new dashboard
- Real-time evasion monitoring in terminal
- AI-powered evasion suggestions (using LLM)

---

### `03_training_rl_agent.md` 🟡 MEDIUM PRIORITY

**Changes needed:**
- Update import paths if changed
- Update API endpoints for agent training
- Add dashboard visualization of training progress

**New sections:**
- View RL agent performance in dashboard
- Export training data
- Visualize in Grafana

---

### `04_llm_integration.md` 🔴 HIGH PRIORITY - COMPLETE REWRITE

**Current:** Minimal/placeholder content

**Needs complete tutorial:**

```markdown
# Tutorial 4: LLM Integration with OpenRouter

## Overview (5 minutes)
- What is OpenRouter
- Why we use it (200+ models, FREE options)
- Our implementation

## Setup (10 minutes)
### Step 1: Get OpenRouter API Key
- Sign up at https://openrouter.ai
- Get FREE API key
- Free credits available

### Step 2: Configure API Key
- Create `ai/llm_integration/.env`
- Add your key
- Choose model (GPT-3.5, Llama2, Gemini)

### Step 3: Test Connection
- Run test script
- Verify LLM responds

## Using LLM Features (20 minutes)
### Credential Generation
- How it works
- Test with different devices
- View results

### Attack Success Prediction
- How AI predicts success
- Confidence scores
- Recommendations

### Optimal Timing Suggestions
- When to attack
- Why specific times
- Historical patterns

## Dashboard Integration (10 minutes)
- View AI predictions in dashboard
- Real-time updates
- Customize settings

## Advanced (15 minutes)
- Switch between models
- Use local Ollama
- Custom prompts
- Cost optimization

## Troubleshooting
- API key issues
- Rate limits
- Model selection
```

---

### `TUTORIAL.md` 🟡 MEDIUM PRIORITY

**Changes needed:**
- Update all port references
- Add dashboard section
- Update Docker Compose commands (use `docker-compose.fixed.yml`)
- Add OpenRouter setup
- Update AI API endpoints

---

### `live_demo/README.md` & `sandbox_environment.sh` 🟢 LOW PRIORITY

**Changes needed:**
- Update port mappings in sandbox script
- Add dashboard to sandbox
- Update test commands

---

## 🆕 New Tutorials to Create

### 1. `05_dashboard_features.md` 🔴 CRITICAL

**Content:**
```markdown
# Tutorial 5: Using the Enhanced Dashboard

## Overview
- New dashboard features
- Port: 3003
- What you can do

## Getting Started (10 min)
- Access dashboard
- Navigate interface
- Key features overview

## Bot Management (15 min)
- View active bots
- Create groups
- Execute commands
- Set up recovery

## Attack Orchestration (15 min)
- Schedule attacks
- Use templates
- View history
- Predictions

## Interactive Terminal (10 min)
- Access terminal
- Available commands
- Use cases

## AI Features (15 min)
- Bot churn prediction
- Attack success rates
- Optimal timing
- Target recommendations

## Monitoring (10 min)
- Grafana dashboards
- Real-time metrics
- Notifications

## Customization (10 min)
- Themes
- Webhooks
- Notifications
```

### 2. `06_webhooks_notifications.md` 🟡 OPTIONAL

**Content:**
- Setting up Slack/Discord webhooks
- Custom notification rules
- Event-based alerts
- Testing webhooks

---

## 📊 Priority Matrix

| File | Priority | Effort | Impact | Status |
|------|----------|--------|--------|--------|
| `01_getting_started.md` | 🔴 Critical | High | High | Must update |
| `04_llm_integration.md` | 🔴 Critical | High | High | Complete rewrite |
| `05_dashboard_features.md` | 🔴 Critical | High | High | Create new |
| `02_detection_evasion.md` | 🟡 Medium | Medium | Medium | Update ports |
| `03_training_rl_agent.md` | 🟡 Medium | Low | Medium | Minor updates |
| `TUTORIAL.md` | 🟡 Medium | Medium | Medium | Update all |
| `06_webhooks_notifications.md` | 🟢 Low | Medium | Low | Optional |
| `live_demo/*` | 🟢 Low | Low | Low | Later |

---

## 🔧 Quick Fix Template

For each file, apply these systematic fixes:

### 1. Global Search & Replace

```bash
# In all tutorial files:
sed -i 's|localhost:5000|localhost:8001|g' docs/tutorials/**/*.md
sed -i 's|localhost:3000|localhost:3010|g' docs/tutorials/**/*.md
sed -i 's|localhost:9091|localhost:9090|g' docs/tutorials/**/*.md
```

### 2. Add Dashboard Section

Insert after "Step 5" in getting started:

```markdown
## Step 6: Access the Dashboard (5 minutes)

The modern web dashboard provides a visual interface for all operations.

1. Open your browser to: http://localhost:3003

2. Explore the interface:
   - **Dashboard**: Overview of system status
   - **Bots**: Manage your bot network
   - **Attacks**: Schedule and monitor attacks
   - **Analytics**: AI-powered predictions
   - **Terminal**: Interactive command interface

3. Try the terminal: http://localhost:3003/test-terminal
   ```
   help
   status
   bots
   ```

✅ **Checkpoint**: You can access and navigate the dashboard.
```

### 3. Add Service URLs Table

Replace all "Useful URLs" sections with:

```markdown
### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | http://localhost:3003 | Main UI |
| **Terminal** | http://localhost:3003/test-terminal | Interactive CLI |
| **AI Service** | http://localhost:8001 | ML predictions |
| **C&C API** | http://localhost:8080 | Bot management |
| **Grafana** | http://localhost:3010 | Metrics visualization |
| **Prometheus** | http://localhost:9090 | Metrics collection |
| **Jaeger** | http://localhost:16686 | Tracing |

**Credentials:**
- Grafana: admin/admin
- Database: mirai/research_password_change_me
```

---

## 📝 Summary

**Updates Required:**
- ✅ 6 existing tutorials need updates
- ✅ 2 new tutorials should be created
- ✅ All port numbers must be corrected
- ✅ Dashboard integration must be added
- ✅ LLM tutorial needs complete rewrite

**Estimated Effort:**
- Critical updates: 4-6 hours
- Medium updates: 2-3 hours
- New tutorials: 3-4 hours
- **Total: 9-13 hours**

**Immediate Actions:**
1. Fix port numbers globally (30 min)
2. Add dashboard sections to getting started (1 hour)
3. Rewrite LLM integration tutorial (2 hours)
4. Create dashboard features tutorial (3 hours)

---

**Conclusion:** Yes, we definitely need to update these tutorials. The port changes alone would confuse users, and the new dashboard features are completely undocumented in the tutorials.

**Last Updated:** 2026-02-25

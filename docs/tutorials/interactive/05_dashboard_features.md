# Interactive Tutorial 5: Dashboard Features & Bot Management

**Duration:** 60 minutes  
**Difficulty:** Intermediate  
**Prerequisites:** Tutorial 1 completed, Dashboard accessible

---

## 📚 What You'll Learn

By the end of this tutorial, you will:
- ✅ Navigate the enhanced dashboard interface
- ✅ Manage bots with grouping and tagging
- ✅ Execute custom commands on bots
- ✅ Set up automated recovery rules
- ✅ Schedule attacks with cron expressions
- ✅ Use the interactive terminal
- ✅ Configure webhooks and notifications
- ✅ View AI-powered predictions

---

## Part 1: Dashboard Overview (10 minutes)

### Accessing the Dashboard

```bash
# Start dashboard if not running
cd dashboard
npm run dev

# Open in browser
open http://localhost:3003
```

### Main Interface Sections

The dashboard has 6 main sections:

1. **Dashboard** (/) - System overview
2. **Bots** (/bots) - Bot network management
3. **Attacks** (/attacks) - Attack orchestration
4. **Analytics** (/analytics) - AI predictions
5. **Settings** (/settings) - Configuration
6. **Terminal** (/test-terminal) - Interactive CLI

### Dashboard Page Features

Navigate to http://localhost:3003

You'll see:
- **Active Bots Count** - Real-time bot statistics
- **Active Attacks** - Currently running operations
- **System Status** - Service health indicators
- **Recent Activity** - Latest events timeline
- **Network Map** - Geographic distribution
- **Performance Metrics** - CPU, memory, network

✅ **Checkpoint**: You can navigate the main dashboard interface.

---

## Part 2: Bot Management (15 minutes)

### Viewing Active Bots

1. **Navigate to Bots page:**
   ```bash
   open http://localhost:3003/bots
   ```

2. **Bot List displays:**
   - Bot ID and name
   - IP address and location
   - Status (active/idle/offline)
   - Last seen timestamp
   - Resource usage (CPU, memory, network)
   - Health indicator

### Creating Bot Groups

Group bots by location, type, or purpose:

1. **Click "Bot Grouping" tab**

2. **Create a new group:**
   - Click "+ New Group"
   - Name: "US-East-Routers"
   - Tags: production, us-east, router
   - Click "Create"

3. **Add bots to group:**
   - Select bots from "Available bots" list
   - Click "Add" next to each bot
   - Bots appear in the group

4. **Try creating more groups:**
   - "EU-Cameras" - European camera devices
   - "Asia-DVRs" - Asian DVR systems
   - "Testing" - Bots for testing purposes

### Bulk Operations

Execute actions on multiple bots:

1. **Select multiple bots:**
   - Check boxes next to bot names
   - Or use "Select All" button

2. **Choose operation:**
   - **Start** - Activate idle bots
   - **Stop** - Pause bot operations
   - **Restart** - Reboot bot processes
   - **Update** - Push new configuration
   - **Delete** - Remove from network

3. **Execute:**
   - Click operation button
   - Confirm action
   - View progress and results

✅ **Checkpoint**: You can group bots and perform bulk operations.

---

## Part 3: Custom Commands (15 minutes)

### Command Templates

The dashboard includes 6 pre-built command templates:

1. **Update Configuration**
   - Downloads new config from URL
   - Risk: Low
   - Use: Update bot settings remotely

2. **Restart Bot Service**
   - Kills and restarts bot daemon
   - Risk: Medium
   - Use: Fix hung processes

3. **Clear Logs**
   - Removes log files to free space
   - Risk: Low
   - Use: Disk cleanup

4. **Port Scan**
   - Scans target for open ports
   - Risk: High
   - Use: Reconnaissance

5. **Download Update**
   - Downloads and installs bot update
   - Risk: High
   - Use: Version upgrades

6. **Kill Process**
   - Terminates specific process
   - Risk: Medium
   - Use: Stop interfering services

### Using Command Templates

1. **Navigate to Bots page**

2. **Select a bot**

3. **Click "Custom Commands" tab**

4. **Choose a template:**
   - Click on "Update Configuration"
   - It shows required parameters

5. **Fill in parameters:**
   - Config URL: `http://cnc.example.com/config.json`
   - Click "Execute Template"

6. **View results:**
   - Command appears in "Recent Commands"
   - Status shows success/failed/pending
   - Output displayed if available

### Custom Commands

Execute arbitrary shell commands:

1. **Click "Custom Command" tab**

2. **Enter command:**
   ```bash
   /bin/busybox ps aux
   ```

3. **Click "Execute Custom Command"**

4. **Review warning:**
   - Commands execute with bot privileges
   - Can be dangerous
   - Understand impact before running

5. **View command history:**
   - Shows last 5 commands
   - Execution time
   - Success/failure status

⚠️ **Warning:** Custom commands are powerful. Test on one bot first!

✅ **Checkpoint**: You can execute templated and custom commands on bots.

---

## Part 4: Automated Recovery (10 minutes)

### Understanding Recovery Rules

Recovery rules automatically fix unhealthy bots based on conditions:

**Conditions:**
- Bot offline
- High CPU usage (>90%)
- High memory usage (>90%)
- Unresponsive (>30s)

**Actions:**
- Restart bot
- Stop bot
- Send notification
- Execute custom command

### Creating Recovery Rules

1. **Navigate to Bots page**

2. **Click "Recovery" tab**

3. **Click "+ New Rule"**

4. **Configure rule:**
   - **Name:** "Auto-restart offline bots"
   - **Condition:** Bot is offline
   - **Action:** Restart bot
   - **Cooldown:** 300 seconds (5 minutes)
   - **Enabled:** Yes

5. **Click "Create Rule"**

### More Recovery Rules

Create additional rules:

**High CPU Recovery:**
- Condition: High CPU
- Threshold: 95%
- Action: Restart
- Cooldown: 600s

**Unresponsive Recovery:**
- Condition: Unresponsive
- Threshold: 30000ms (30 seconds)
- Action: Custom command
- Command: `killall -9 bot && /bin/bot &`
- Cooldown: 300s

### Testing Recovery

1. **Apply rule manually:**
   - Select a rule
   - Click "Apply Now"
   - View recovery statistics

2. **Monitor automatic recovery:**
   - Rules check every 60 seconds
   - Cooldown prevents rapid cycling
   - View "Recovery Statistics" panel

✅ **Checkpoint**: Automated recovery rules are configured and active.

---

## Part 5: Attack Scheduling (10 minutes)

### Navigate to Attacks Page

```bash
open http://localhost:3003/attacks
```

### Using Attack Templates

Pre-configured attack types:

1. **UDP Flood** - High volume UDP packets
2. **TCP SYN** - SYN flood attack
3. **HTTP Flood** - Application layer flood
4. **DNS Amplification** - Amplification attack

### Scheduling an Attack

1. **Click "Schedule Attack" button**

2. **Select template:**
   - Choose "UDP Flood"

3. **Configure attack:**
   - **Target:** 192.168.1.100
   - **Port:** 80
   - **Duration:** 60 seconds
   - **Bots:** Select from list or use group

4. **Set schedule:**
   - **Manual:** Execute immediately
   - **Once:** Specific date/time
   - **Recurring:** Cron expression

5. **Cron Examples:**
   ```
   0 */2 * * *     # Every 2 hours
   0 0 * * *       # Daily at midnight
   0 0 * * 1       # Every Monday
   */15 * * * *    # Every 15 minutes
   0 14-18 * * *   # Between 2PM-6PM daily
   ```

6. **Click "Schedule Attack"**

### Viewing Attack History

1. **Click "History" tab**

2. **Filter attacks:**
   - All / Success / Failed

3. **Select an attack to view:**
   - Configuration details
   - Performance metrics
   - Success rate
   - Bots used
   - Bandwidth consumed

4. **Replay an attack:**
   - Click "Replay Attack"
   - Reuses same configuration
   - Executes immediately

5. **Predict success:**
   - Click "Predict Success Rate"
   - AI analyzes configuration
   - Shows probability and confidence
   - Provides recommendations

✅ **Checkpoint**: You can schedule and monitor attacks.

---

## Part 6: Interactive Terminal (10 minutes)

### Accessing the Terminal

```bash
open http://localhost:3003/test-terminal
```

### Available Commands

Type `help` to see all commands:

```
help          - Show this help message
status        - Display system status
bots          - List active bots
attacks       - Show active attacks
scan <target> - Scan a target
ping <host>   - Ping a host
clear         - Clear terminal
exit          - Exit terminal
```

### Terminal Features

**Command History:**
- Press ↑ (up arrow) for previous commands
- Press ↓ (down arrow) for next commands
- Stores last 50 commands

**Auto-completion:**
- Tab completion for commands
- Suggests based on history

**Copy/Paste:**
- Ctrl+C / Cmd+C to copy
- Ctrl+V / Cmd+V to paste

### Example Session

```bash
# Check system status
status

# Output shows:
# System Status:
#   ✓ AI Service:     ONLINE
#   ✓ C&C Server:     ONLINE
#   ✓ Database:       CONNECTED
#   • Active Bots:    127
#   • Active Attacks: 3

# List bots
bots

# Scan a target
scan 192.168.1.1

# Ping test
ping google.com

# Clear screen
clear
```

✅ **Checkpoint**: You can use the interactive terminal.

---

## Part 7: Notifications & Webhooks (5 minutes)

### Configure Notifications

1. **Click bell icon** (top right)

2. **Notification Settings:**
   - **Sound Alerts:** Enable/disable
   - **Desktop Notifications:** Request permission
   - **Toast Notifications:** Always on

3. **Notification Rules:**
   - Bot Offline Alert: High priority
   - Attack Completion: Medium priority
   - High Resource Usage: Medium priority
   - Security Alert: High priority

4. **Toggle rules on/off**

### Set Up Webhooks

1. **Navigate to Settings**

2. **Click "Webhooks" tab**

3. **Add Slack webhook:**
   - **Name:** "Slack Notifications"
   - **URL:** `https://hooks.slack.com/services/...`
   - **Events:** 
     - ✅ bot.offline
     - ✅ attack.completed
     - ✅ system.alert
   - Click "Create Webhook"

4. **Test webhook:**
   - Click "Test" button
   - Check Slack channel for test message

5. **Other webhook options:**
   - Discord: Similar to Slack
   - Custom: Any webhook-compatible service

✅ **Checkpoint**: Notifications and webhooks are configured.

---

## Part 8: AI Analytics (5 minutes)

### View AI Predictions

```bash
open http://localhost:3003/analytics
```

### Available Predictions

**Bot Churn Prediction:**
- 24-hour forecast
- Risk level (low/medium/high)
- Contributing factors
- Powered by GPT-3.5

**Attack Success Rate:**
- Probability percentage
- Confidence score
- Recommendations
- Historical analysis

**Optimal Attack Time:**
- Best time suggestion
- Optimization score
- Reasoning explanation
- Traffic pattern analysis

### Anomaly Detection

Real-time unusual pattern detection:
- Traffic spikes
- Resource anomalies
- New geographic regions
- Security events

### Refresh Predictions

- Click "Refresh Predictions"
- Fetches new data from LLM
- Takes 2-3 seconds
- Updates all cards

✅ **Checkpoint**: You can view and understand AI predictions.

---

## Part 9: Theme Customization (Optional)

### Access Theme Settings

1. Navigate to Settings
2. Click "Appearance" tab

### Change Theme

**Available themes:**
- **Dark** - Default dark mode (cyan/green)
- **Light** - High contrast light mode
- **Cyberpunk** - Purple/pink neon aesthetic

### Customize

**Font Size:**
- Adjust slider (12-20px)
- A+ / A- buttons

**Layout Density:**
- Compact - More information
- Comfortable - Balanced
- Spacious - More whitespace

**Accent Color:**
- 6 pre-defined colors
- Click to apply instantly

**Save Preferences:**
- Automatically saved to localStorage
- Persists across sessions

---

## Hands-On Exercise

**Challenge:** Complete bot management workflow

1. **Create a bot group** called "Exercise-Bots"
2. **Add 5 bots** to the group
3. **Execute "Update Configuration"** command on the group
4. **Create a recovery rule** for offline bots in this group
5. **Schedule a UDP flood attack** using only this group
6. **Set schedule** for "Every hour"
7. **View attack history** and predict success rate
8. **Set up webhook** to notify on attack completion

**Bonus:**
- Use terminal to check system status
- View bot churn prediction
- Customize theme to cyberpunk mode

---

## Quiz

Test your understanding:

1. **How do you create a bot group?**
   - Navigate to Bots → Bot Grouping → + New Group ✓

2. **What are the 4 recovery conditions?**
   - Offline, High CPU, High memory, Unresponsive ✓

3. **What is a cron expression?**
   - A time-based schedule format ✓

4. **Where do you configure webhooks?**
   - Settings → Webhooks ✓

5. **What port is the dashboard on?**
   - 3003 ✓

---

## Summary

**What You Learned:**
- ✅ Dashboard navigation and interface
- ✅ Bot grouping and bulk operations
- ✅ Custom command execution (templates + raw)
- ✅ Automated recovery rules
- ✅ Attack scheduling with cron
- ✅ Interactive terminal usage
- ✅ Notifications and webhooks
- ✅ AI analytics and predictions
- ✅ Theme customization

**Key Features:**
- **Bot Management:** Groups, bulk ops, custom commands
- **Automated Recovery:** Self-healing bot network
- **Attack Scheduling:** Cron-based automation
- **Terminal:** Interactive CLI in browser
- **Webhooks:** Slack, Discord, custom integrations
- **AI Predictions:** Churn, success rate, timing
- **Customization:** Themes, layout, colors

**Next Steps:**
- Explore advanced attack templates
- Set up production recovery rules
- Integrate with your monitoring
- Configure all webhooks
- Optimize bot groups by region

---

## Additional Resources

**Dashboard Documentation:**
- Features: `docs/guides/DASHBOARD_ENHANCEMENTS.md`
- Deployment: `docs/deployment/DASHBOARD_DEPLOYMENT.md`
- Quick Reference: `docs/deployment/QUICK_REFERENCE.md`

**Video Tutorials:** (Coming soon)
- Bot Management Walkthrough
- Attack Scheduling Best Practices
- Terminal Power User Tips

---

**Congratulations!** You've mastered the Mirai 2026 Dashboard! 🎉

**Last Updated:** 2026-02-25  
**Tutorial Version:** 2.0


## Step 6: Access the Dashboard (10 minutes)

### What is the Dashboard?

The Mirai 2026 Dashboard is a modern web interface that provides visual control over your entire botnet infrastructure.

**Dashboard URL:** http://localhost:3003

**Key Features:**
- Real-time bot monitoring
- Attack scheduling
- AI-powered predictions
- Interactive terminal
- Webhook integrations
- Custom notifications

### Accessing the Dashboard

1. **Open the dashboard in your browser:**

```bash
open http://localhost:3003
# Or manually navigate to: http://localhost:3003
```

2. **Explore the main sections:**

   - **Dashboard** - System overview with live statistics
   - **Bots** - Manage your bot network
   - **Attacks** - Schedule and monitor attacks
   - **Analytics** - AI predictions and insights
   - **Settings** - Configure webhooks and notifications

### Try the Interactive Terminal

The dashboard includes a powerful terminal interface:

1. **Access the terminal:**

```bash
open http://localhost:3003/test-terminal
```

2. **Try these commands:**

```
help              # Show all available commands
status            # View system status
bots              # List active bots
attacks           # Show active attacks
scan 192.168.1.1  # Scan a target
ping google.com   # Test connectivity
clear             # Clear screen
```

3. **Use arrow keys to navigate command history**

### Explore AI Features

Navigate to the Analytics page to see AI-powered features:

1. Go to http://localhost:3003/analytics

2. View predictions:
   - **Bot Churn Prediction** - 24-hour forecast
   - **Attack Success Rate** - ML-based probability
   - **Optimal Timing** - Best time to launch attacks
   - **Anomaly Detection** - Unusual patterns

These predictions use GPT-3.5 Turbo via OpenRouter (configured earlier).

### Set Up Notifications

1. Click the bell icon in the top right
2. Configure notification rules
3. Enable desktop notifications (optional)
4. Set up sound alerts (optional)

✅ **Checkpoint**: You can access the dashboard and terminal interface.


# Interactive Tutorial 4: LLM Integration with OpenRouter

**Duration:** 45 minutes  
**Difficulty:** Intermediate  
**Prerequisites:** Tutorial 1 completed, AI service running

---

## 📚 What You'll Learn

By the end of this tutorial, you will:
- ✅ Understand OpenRouter and why we use it
- ✅ Configure OpenRouter API key for GPT-3.5
- ✅ Use FREE LLM models (Llama2, Gemini, Mistral)
- ✅ Generate credentials with AI
- ✅ Get attack success predictions
- ✅ View AI insights in the dashboard

---

## Part 1: Understanding OpenRouter (5 minutes)

### What is OpenRouter?

OpenRouter is a unified API that provides access to 200+ AI models from different providers:
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Meta (Llama 2)
- Google (Gemini)
- Mistral AI
- And many more!

### Why We Use OpenRouter

**Advantages:**
1. **One API for everything** - No need to manage multiple API keys
2. **FREE models available** - Llama 2, Gemini Pro, Mistral
3. **Pay-as-you-go** - Only pay for what you use
4. **Model flexibility** - Switch models without code changes
5. **Better rates** - Often cheaper than direct API access

### Architecture

```
Mirai Dashboard/AI Service
         ↓
   OpenRouter API
         ↓
   ┌──────┬──────┬──────┐
   GPT-3.5  Claude  Llama2
```

---

## Part 2: Getting Your OpenRouter API Key (10 minutes)

### Step 1: Sign Up

1. Go to https://openrouter.ai

2. Click "Sign In" → Choose authentication method:
   - GitHub (recommended)
   - Google
   - Email

3. After signing in, you'll get:
   - **FREE credits** to start
   - Access to FREE models
   - Dashboard to monitor usage

### Step 2: Generate API Key

1. Go to https://openrouter.ai/keys

2. Click "Create Key"

3. Give it a name: `Mirai 2026 Research`

4. Click "Create"

5. **Copy your API key** - it looks like:
   ```
   sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   ⚠️ **Important:** Save this key - you won't see it again!

### Step 3: Choose Your Model

**FREE Models (No Cost):**
- `meta-llama/llama-2-70b-chat` - Meta's Llama 2
- `google/gemini-pro` - Google's Gemini
- `mistralai/mistral-7b-instruct` - Mistral AI

**Paid Models (High Quality):**
- `openai/gpt-3.5-turbo` - Fast, cheap, good quality
- `openai/gpt-4` - Best quality, more expensive
- `anthropic/claude-3-sonnet` - Excellent for analysis

**For this tutorial, we'll use:** `openai/gpt-3.5-turbo` (very cheap, ~$0.001 per request)

---

## Part 3: Configuring Mirai 2026 (10 minutes)

### Step 1: Create Environment File

```bash
# Navigate to the LLM integration directory
cd ai/llm_integration/

# Create .env file from template
cp .env.example .env

# Open in your editor
nano .env
# Or: vim .env
# Or: code .env
```

### Step 2: Add Your API Key

Edit `.env` and add your configuration:

```bash
# OpenRouter Configuration (Recommended)
OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE
OPENROUTER_MODEL=openai/gpt-3.5-turbo
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Advanced Settings
LLM_TEMPERATURE=0.7        # Creativity (0-1, higher = more creative)
LLM_MAX_TOKENS=2000        # Max response length
LLM_TIMEOUT=30             # Request timeout in seconds

# Default Provider
LLM_PROVIDER=openrouter
```

**Replace** `YOUR_KEY_HERE` with your actual API key!

### Step 3: Verify Configuration

```bash
# Check the file
cat .env | grep OPENROUTER_API_KEY

# Should show: OPENROUTER_API_KEY=sk-or-v1-xxxxx...
```

### Step 4: Restart AI Service

```bash
# If running in Docker
docker-compose -f docker-compose.fixed.yml restart ai-service

# If running locally
cd ../..
cd ai
python api_endpoints.py
```

Wait 10 seconds for the service to restart.

✅ **Checkpoint**: Your API key is configured and the service restarted.

---

## Part 4: Testing LLM Integration (10 minutes)

### Test 1: Simple Health Check

```bash
# Check AI service is running
curl http://localhost:8001/health

# Expected output:
# {
#   "status": "healthy",
#   "timestamp": "2026-02-25T...",
#   "llm_available": true
# }
```

### Test 2: Bot Churn Prediction

This uses the LLM to analyze patterns and predict bot loss:

```bash
curl -X POST http://localhost:8001/predict/bot-churn

# Expected output:
# {
#   "rate": 15,
#   "risk": "medium",
#   "factors": [
#     "High detection rate in last 48h",
#     "ISP blocking patterns detected"
#   ],
#   "timestamp": "2026-02-25T..."
# }
```

### Test 3: Credential Generation (LLM-Powered)

Generate device credentials using AI:

```bash
curl -X POST http://localhost:8001/generate-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "device_type": "router",
    "count": 5
  }'

# Expected output:
# {
#   "success": true,
#   "credentials": [
#     {"username": "admin", "password": "admin"},
#     {"username": "admin", "password": "password"},
#     {"username": "root", "password": "root"},
#     ...
#   ],
#   "source": "llm"
# }
```

Note: `"source": "llm"` means it used the LLM! If it says `"source": "default"`, check your API key.

### Test 4: Attack Success Prediction

```bash
curl -X POST http://localhost:8001/predict/attack-success \
  -H "Content-Type: application/json" \
  -d '{
    "type": "udp",
    "target": "192.168.1.1",
    "duration": 300
  }'

# Expected output:
# {
#   "probability": 0.78,
#   "confidence": 0.85,
#   "recommendations": [
#     "Use distributed bot sources for better evasion",
#     "Optimize UDP packet size for target",
#     "Target during peak traffic hours"
#   ]
# }
```

✅ **Checkpoint**: All API endpoints are responding with LLM-powered results.

---

## Part 5: Dashboard Integration (10 minutes)

### View AI Predictions in Dashboard

1. **Open the dashboard:**

```bash
open http://localhost:3003
```

2. **Navigate to Analytics page:**
   - Click "Analytics" in the sidebar
   - Or go to: http://localhost:3003/analytics

3. **View Predictions:**

   You'll see three main prediction cards:

   **Bot Churn Prediction:**
   - Forecasts bot loss in next 24 hours
   - Shows risk level (low/medium/high)
   - Lists contributing factors

   **Attack Success Rate:**
   - Predicts likelihood of success
   - Shows confidence score
   - Provides recommendations

   **Optimal Attack Time:**
   - Suggests best time to launch
   - Shows optimization score
   - Explains reasoning

4. **Refresh Predictions:**
   - Click "Refresh Predictions" button
   - Watch as new data is fetched from the LLM
   - Takes 2-3 seconds per prediction

### Check Anomaly Detection

Scroll down to see AI-detected anomalies:
- Unusual traffic patterns
- Resource usage spikes
- New geographic regions
- Security alerts

✅ **Checkpoint**: You can view real-time AI predictions in the dashboard.

---

## Part 6: Using FREE Models (5 minutes)

Want to use FREE models instead of paying for GPT-3.5?

### Switch to Llama 2 (FREE)

Edit `ai/llm_integration/.env`:

```bash
# Change this:
OPENROUTER_MODEL=openai/gpt-3.5-turbo

# To this:
OPENROUTER_MODEL=meta-llama/llama-2-70b-chat
```

### Other FREE Options

```bash
# Google Gemini Pro (FREE)
OPENROUTER_MODEL=google/gemini-pro

# Mistral 7B (FREE)
OPENROUTER_MODEL=mistralai/mistral-7b-instruct

# Llama 2 70B (FREE, most powerful)
OPENROUTER_MODEL=meta-llama/llama-2-70b-chat
```

### Restart and Test

```bash
# Restart AI service
docker restart mirai-ai-service

# Test with FREE model
curl -X POST http://localhost:8001/predict/bot-churn
```

The FREE models work just as well for most use cases!

---

## Part 7: Advanced Usage (5 minutes)

### Using Local Ollama (Completely FREE)

Want to run models locally without any API calls?

1. **Install Ollama:**
   ```bash
   # macOS
   brew install ollama

   # Linux
   curl https://ollama.ai/install.sh | sh
   ```

2. **Pull a model:**
   ```bash
   ollama pull llama2
   ```

3. **Configure Mirai:**
   ```bash
   # Edit ai/llm_integration/.env
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   ```

4. **Restart and test:**
   ```bash
   docker restart mirai-ai-service
   curl -X POST http://localhost:8001/predict/bot-churn
   ```

Now you're running LLMs completely locally with no API costs!

### Monitoring Usage

Check your OpenRouter usage:
1. Go to https://openrouter.ai/usage
2. View costs per model
3. Set spending limits
4. Download usage reports

**Typical costs:**
- GPT-3.5 Turbo: ~$0.001 per request
- FREE models: $0.00
- GPT-4: ~$0.03 per request

---

## Troubleshooting

### Issue: "llm_available": false

**Cause:** API key not configured or invalid

**Solution:**
```bash
# Check your .env file
cat ai/llm_integration/.env | grep OPENROUTER_API_KEY

# Make sure it starts with: sk-or-v1-

# Restart service
docker restart mirai-ai-service
```

### Issue: "source": "default" instead of "llm"

**Cause:** LLM call failed, using fallback data

**Solution:**
```bash
# Check AI service logs
docker logs mirai-ai-service --tail 50

# Look for errors like:
# - "API key invalid"
# - "Rate limit exceeded"
# - "Model not found"
```

### Issue: Slow responses

**Cause:** Model taking long to generate

**Solution:**
```bash
# Use a faster model
OPENROUTER_MODEL=openai/gpt-3.5-turbo  # Fast
# Instead of:
OPENROUTER_MODEL=openai/gpt-4  # Slower but better
```

### Issue: Rate limits

**Cause:** Too many requests

**Solution:**
- FREE models have no rate limits
- Paid models: Check OpenRouter dashboard
- Add delays between requests
- Cache results

---

## Hands-On Exercise

**Challenge:** Create a custom prediction

1. Choose a target type (camera, router, DVR)
2. Generate credentials for it
3. Predict attack success
4. View recommendations
5. Check optimal timing

**Example workflow:**
```bash
# 1. Generate credentials for cameras
curl -X POST http://localhost:8001/generate-credentials \
  -H "Content-Type: application/json" \
  -d '{"device_type": "camera", "count": 10}'

# 2. Predict attack success
curl -X POST http://localhost:8001/predict/attack-success \
  -H "Content-Type: application/json" \
  -d '{"type": "tcp", "target": "192.168.1.100"}'

# 3. Get optimal timing
curl -X POST http://localhost:8001/predict/optimal-timing \
  -H "Content-Type: application/json" \
  -d '{"attack_type": "tcp"}'
```

---

## Quiz

Test your understanding:

1. **What is OpenRouter?**
   - A) An LLM model
   - B) A unified API for 200+ AI models ✓
   - C) A router configuration tool

2. **Which models are FREE on OpenRouter?**
   - A) GPT-4
   - B) Llama 2, Gemini, Mistral ✓
   - C) Claude

3. **Where do you configure the API key?**
   - A) Dashboard settings
   - B) `ai/llm_integration/.env` ✓
   - C) Docker compose file

4. **What does "source": "llm" mean?**
   - A) Using fallback data
   - B) Using the LLM API successfully ✓
   - C) Local model

5. **How can you run models completely free?**
   - A) Use OpenRouter FREE models ✓
   - B) Use local Ollama ✓
   - C) Both A and B ✓

---

## Summary

**What You Learned:**
- ✅ OpenRouter provides unified access to 200+ models
- ✅ FREE models available (Llama 2, Gemini, Mistral)
- ✅ API key configuration in `ai/llm_integration/.env`
- ✅ Testing LLM endpoints
- ✅ Dashboard integration for predictions
- ✅ Using local Ollama for completely free inference
- ✅ Monitoring usage and costs

**Key Endpoints:**
- `/predict/bot-churn` - Forecast bot loss
- `/generate-credentials` - AI-powered credentials
- `/predict/attack-success` - Attack probability
- `/predict/optimal-timing` - Best attack time

**Next Steps:**
- Experiment with different models
- Try FREE models to save costs
- Set up local Ollama for privacy
- Integrate predictions into attack planning

---

## Additional Resources

**OpenRouter:**
- Dashboard: https://openrouter.ai/
- Docs: https://openrouter.ai/docs
- Models: https://openrouter.ai/models
- Pricing: https://openrouter.ai/pricing

**Local LLMs:**
- Ollama: https://ollama.ai
- GPT4All: https://gpt4all.io

**Mirai Documentation:**
- AI Integration: `docs/api/LLM_INTEGRATION.md`
- API Reference: `docs/api/API_REFERENCE.md`

---

**Ready for the next tutorial?** → [Tutorial 5: Dashboard Features](05_dashboard_features.md)

**Last Updated:** 2026-02-25  
**Tutorial Version:** 2.0

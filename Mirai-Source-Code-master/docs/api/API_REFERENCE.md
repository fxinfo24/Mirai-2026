# API Reference

Quick reference for all Mirai 2026 APIs.

## AI Service API

Base URL: `http://localhost:5000` (default)

### Endpoints

#### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "llm_provider": "openrouter",
  "model": "openai/gpt-3.5-turbo"
}
```

#### Generate Credentials
```bash
POST /api/v1/credentials/generate
Content-Type: application/json

{
  "device_type": "router",
  "count": 10
}
```

Response:
```json
{
  "credentials": [
    {"username": "admin", "password": "admin123", "confidence": 0.92},
    ...
  ],
  "generated_at": "2026-02-24T10:30:00Z"
}
```

#### Suggest Evasion Techniques
```bash
POST /api/v1/evasion/suggest
Content-Type: application/json

{
  "detected_by": "snort",
  "signature": "ET SCAN Potential SSH Scan"
}
```

#### Generate Attack Strategy
```bash
POST /api/v1/attack/strategy
Content-Type: application/json

{
  "target": "web_server",
  "resources": {"bots": 1000, "bandwidth": "10Gbps"}
}
```

## Bot C API

See [src/ai_bridge/ai_bridge.h](../../src/ai_bridge/ai_bridge.h) for C API.

### Example Usage

```c
#include "ai_bridge/ai_bridge.h"

// Initialize
ai_bridge_t *bridge = ai_bridge_init("http://localhost:5000");

// Generate credentials
ai_credentials_t *creds = ai_bridge_generate_credentials(
    bridge, "router", 10
);

// Get evasion strategy
ai_evasion_strategy_t *strategy = ai_bridge_get_evasion_strategy(
    bridge, "snort", "ET SCAN SSH"
);

// Cleanup
ai_bridge_cleanup(bridge);
```

## Related Documentation

- [LLM Integration Guide](LLM_INTEGRATION.md) - Setup LLM providers
- [OpenRouter Guide](OPENROUTER.md) - Recommended LLM API
- [Architecture](../ARCHITECTURE.md) - System design

## Authentication

Currently no authentication (research use only).

For production deployment, add API keys:
```bash
export API_SECRET_KEY="your-secret-key"
```

See [Security Guide](../guides/SECURITY.md) for hardening.

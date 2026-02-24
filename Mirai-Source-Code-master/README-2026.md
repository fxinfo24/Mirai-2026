# Mirai 2026 - Modernized IoT Security Research Platform

> **⚠️ RESEARCH USE ONLY**: This is a modernized version of the historic Mirai botnet source code, intended solely for cybersecurity research, education, and authorized security testing. Unauthorized use is illegal and unethical.

## What's New in 2026

This modernization transforms the 2016 Mirai codebase into a state-of-the-art research platform:

### 🚀 Modern Architecture
- **C17/C23 Standards**: Modern, safe C with comprehensive error handling
- **Cloud-Native**: Kubernetes-ready with observability built-in
- **Microservices**: Modular architecture with clear separation of concerns
- **AI-Powered**: Machine learning for credential intelligence and adaptive scanning

### 🛡️ Security & Ethics
- **Research Safeguards**: Geo-fencing, time limits, audit logging
- **Kill Switch**: Remote emergency shutdown capability
- **Ethical Guidelines**: Clear license and usage policies
- **Honeypot Detection**: Avoids scanning known research networks

### 📊 Observability
- **Prometheus Metrics**: Real-time performance monitoring
- **Grafana Dashboards**: Visual analytics and alerting
- **Distributed Tracing**: Full request flow visibility
- **Structured Logging**: JSON logs for easy parsing

### 🤖 AI Integration
- **LLM Credential Intelligence**: Adaptive credential generation
- **ML Target Prediction**: Smart IP range selection
- **Behavioral Analysis**: Pattern recognition and evasion

## Quick Start

### Prerequisites
```bash
# Ubuntu/Debian
sudo apt-get install cmake build-essential libjson-c-dev libsodium-dev

# macOS
brew install cmake json-c libsodium

# Fedora/RHEL
sudo dnf install cmake gcc json-c-devel libsodium-devel
```

### Build
```bash
# Release build
make release

# Debug build with sanitizers
make debug

# Run tests
make test
```

### Docker Development
```bash
# Build all containers
make docker

# Run development environment
docker-compose up -d
```

## Project Structure

```
mirai-2026/
├── src/
│   ├── bot/              # Bot component (C17)
│   ├── loader/           # Loader component (C17)
│   ├── cnc/              # C&C server (Go)
│   └── common/           # Shared libraries
├── ai/                   # AI/ML components (Python)
│   ├── credential_intel/ # LLM-based credential generation
│   ├── target_predictor/ # ML target selection
│   └── bridge/           # C ↔ Python communication
├── config/               # Configuration files
│   ├── bot.json         # Bot configuration
│   ├── credentials.json # Credential database
│   └── network.json     # Network settings
├── docker/               # Container definitions
├── k8s/                  # Kubernetes manifests
├── terraform/            # Infrastructure as Code
├── tests/                # Test suite
└── docs/                 # Documentation
```

## Key Improvements Over Original

### 1. Configuration Management
**Before (2016)**:
```c
// Hardcoded, XOR-obfuscated
add_entry(TABLE_CNC_DOMAIN, "\x41\x4C\x41\x0C...", 30);
```

**After (2026)**:
```json
{
  "cnc": {
    "domain": "research.example.com",
    "port": 23,
    "encryption": "chacha20-poly1305"
  }
}
```

### 2. Credential Management
**Before**: 62 hardcoded credentials in C code
**After**: JSON database + AI-powered generation
```json
{
  "credentials": [
    {"username": "root", "password": "admin", "weight": 10},
    {"username": "admin", "password": "password", "weight": 7}
  ],
  "ai_generation": {
    "enabled": true,
    "model": "local-llm",
    "breach_database": "/data/breaches.db"
  }
}
```

### 3. Error Handling
**Before**:
```c
if ((fd = socket(AF_INET, SOCK_STREAM, 0)) == -1)
    return; // Silent failure
```

**After**:
```c
result_t result = socket_create(AF_INET, SOCK_STREAM, 0, &fd);
if (result.error) {
    log_error("Socket creation failed", 
              "error", result.error_msg,
              "errno", errno);
    return result;
}
```

### 4. Logging
**Before**: `printf()` debug statements
**After**: Structured JSON logging
```json
{
  "timestamp": "2026-02-24T04:15:30Z",
  "level": "info",
  "component": "scanner",
  "event": "device_found",
  "ip": "192.168.1.100",
  "port": 23,
  "trace_id": "abc123"
}
```

## 📚 Documentation

**Start here:** [README.md](README.md) • [Full Documentation Index](docs/README.md) • [Handover Guide](HANDOVER.md)

Quick links:
- 🚀 [5-Minute Quick Start](docs/guides/QUICKSTART.md)
- 📖 [Complete Getting Started](docs/guides/GETTING_STARTED.md)
- 🤖 [LLM/AI Integration](docs/api/LLM_INTEGRATION.md)
- ☸️ [Kubernetes Deployment](docs/deployment/KUBERNETES.md)
- 🔒 [Security Guide](docs/guides/SECURITY.md)

## AI-Powered Features

### Credential Intelligence
```bash
# Generate optimized credential list using LLM
python ai/credential_intel/generate.py \
  --breach-db /data/breaches.db \
  --target-type "router" \
  --output config/credentials.json
```

### Adaptive Scanning
```bash
# ML-based target prediction
python ai/target_predictor/predict.py \
  --scan-history /data/scans.db \
  --predict-ranges 10
```

## Observability

### Prometheus Metrics
- `mirai_scans_total` - Total scans performed
- `mirai_success_rate` - Credential success rate
- `mirai_bots_active` - Active bot count
- `mirai_scan_duration_seconds` - Scan latency

### Grafana Dashboards
```bash
# Access dashboards
open http://localhost:3000
# Default credentials: admin/admin
```

### Distributed Tracing
```bash
# View traces in Jaeger
open http://localhost:16686
```

## Testing

### Unit Tests
```bash
make test
```

### Integration Tests
```bash
cd tests/integration
docker-compose up -d
pytest test_scanner.py
```

### Fuzzing
```bash
# Build with AFL++
CC=afl-clang-fast make debug
afl-fuzz -i tests/fuzz/inputs -o findings build/debug/mirai_bot
```

## Deployment

### Kubernetes
```bash
# Deploy to cluster
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

### Terraform (AWS)
```bash
cd terraform/aws
terraform init
terraform plan
terraform apply
```

## Ethical Use Guidelines

### ✅ Permitted Uses
- Academic research in controlled environments
- Authorized penetration testing with written permission
- IoT device security hardening and testing
- Cybersecurity education and training
- Defensive security research

### ❌ Prohibited Uses
- Unauthorized access to computer systems
- Deployment on production networks without authorization
- Any illegal or malicious activity
- Distribution for malicious purposes

### Research Environment Requirements
1. **Isolated Network**: Air-gapped or VPN-isolated test environment
2. **Written Authorization**: Documented permission for all testing
3. **Audit Logging**: All activities must be logged and reviewable
4. **Data Protection**: No exfiltration of sensitive data
5. **Responsible Disclosure**: Report vulnerabilities responsibly

## License

This software is provided for **RESEARCH AND EDUCATIONAL PURPOSES ONLY**.

By using this software, you agree to:
- Use only in authorized, controlled environments
- Comply with all applicable laws and regulations
- Not use for malicious purposes
- Report vulnerabilities responsibly
- Acknowledge the original Mirai source in any publications

See [LICENSE](LICENSE) for full terms.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas for Contribution
- Additional AI/ML models
- New IoT protocol support
- Performance optimizations
- Security improvements
- Documentation

## Architecture Documentation

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture information.

## Changelog

### Version 2.0.0 (2026)
- Complete modernization to C17/C23
- AI/ML integration for credential intelligence
- Cloud-native architecture with Kubernetes support
- Comprehensive observability stack
- Research safeguards and ethical guidelines

### Version 1.0.0 (2016)
- Original Mirai source code release

## Acknowledgments

- Original Mirai authors (for the historic source)
- Cybersecurity research community
- Contributors to this modernization effort

## Contact

For research collaboration or security issues: [security@example.com](mailto:security@example.com)

---

**Remember**: With great power comes great responsibility. Use this tool ethically and legally.

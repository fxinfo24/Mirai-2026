# Mirai 2026 - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Option 1: Docker Compose (Recommended for Testing)

```bash
# Clone repository
git clone https://github.com/yourorg/mirai-2026.git
cd mirai-2026

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# Access AI API
curl http://localhost:5000/health

# View logs
docker-compose logs -f
```

### Option 2: Build from Source

```bash
# Install dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y cmake ninja-build \
    libjson-c-dev libsodium-dev libcurl4-openssl-dev

# Build
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTS=ON
cmake --build build

# Run tests
cd build && ctest
```

### Option 3: Kubernetes (Production)

```bash
# Deploy to dev environment
kubectl apply -k k8s/overlays/dev/

# Check deployment
kubectl get pods -n mirai-2026-dev
```

## 📚 What You Get

- **Modern C17/C23 Code**: Rewritten scanner and attack modules
- **AI Integration**: LLM-powered credential generation and ML-based evasion
- **Cloud-Native**: Kubernetes manifests, Terraform modules
- **CI/CD**: GitHub Actions with security scanning
- **Comprehensive Tests**: Unit, integration, and security tests

## 🔍 Explore the Features

### 1. Review the Code
```bash
# Modern scanner with epoll async I/O
cat src/scanner/scanner_modern.c

# Attack modules
cat src/attack/attack_modern.c

# AI bridge for LLM integration
cat src/ai_bridge/ai_bridge.c
```

### 2. Try the AI Features
```bash
# Start AI service
cd ai/
pip install -r requirements.txt
python api_server.py

# Generate credentials (in another terminal)
curl -X POST http://localhost:5000/api/credentials/generate \
  -H "Content-Type: application/json" \
  -d '{"target_device": "IoT Camera", "max_credentials": 10}'
```

### 3. Set Up Docker
```bash
# Build images
docker build -f docker/Dockerfile.bot -t mirai-2026/bot:latest .
docker build -f docker/Dockerfile.ai-service -t mirai-2026/ai:latest .

# Run with docker-compose
docker-compose up -d
```

## 📖 Documentation

- **Architecture**: See `docs/ARCHITECTURE.md`
- **Deployment**: See `docs/DEPLOYMENT.md`
- **Security**: See `docs/SECURITY.md`
- **Tutorial**: See `docs/TUTORIAL.md`
- **API Reference**: See `README-2026.md`

## 🎯 Project Structure

```
mirai-2026/
├── src/
│   ├── scanner/        # Modern scanner module (C17)
│   ├── attack/         # Attack modules (TCP, UDP, HTTP, etc.)
│   ├── ai_bridge/      # C bridge to Python AI services
│   ├── common/         # Shared utilities (logger, config, crypto)
│   └── bot/            # Main bot application
├── ai/
│   ├── credential_intel/  # LLM credential generation
│   ├── ml_evasion/        # ML pattern evolution
│   └── api_server.py      # REST API server
├── k8s/
│   ├── base/              # Base Kubernetes manifests
│   └── overlays/          # Environment-specific configs
├── terraform/             # Cloud infrastructure as code
├── tests/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── .github/workflows/     # CI/CD pipelines
└── docs/                  # Documentation

```

## ⚠️ Important Notes

### This is a RESEARCH PLATFORM

- ✅ Use only in isolated lab environments
- ✅ Educational and security research purposes
- ❌ Never deploy against production networks
- ❌ Never target systems you don't own
- ❌ Illegal use is prohibited

### Security

All code includes security scanning:
- Trivy for container vulnerabilities
- CodeQL for static analysis
- Bandit for Python security
- Semgrep for policy enforcement

## 🆘 Need Help?

1. Check `docs/TUTORIAL.md` for detailed walkthrough
2. Review `TROUBLESHOOTING.md` for common issues
3. Open an issue on GitHub
4. Read the original `ForumPost.txt` for historical context

## 🔄 What Changed from Original Mirai?

### Phase 1: Foundation ✅
- Modern build system (CMake)
- Structured logging
- Configuration management
- Crypto utilities

### Phase 2: Code Modernization ✅
- C17/C23 standards
- Async I/O with epoll
- Modular attack framework
- Comprehensive test suite

### Phase 3: AI Integration ✅
- LLM-powered credential generation
- ML-based pattern evolution
- Adaptive evasion techniques
- AI API bridge (C ↔ Python)

### Phase 4: Cloud-Native ✅
- Kubernetes deployments
- Terraform infrastructure
- Auto-scaling support
- Production-ready configs

### Phase 5: Polish ✅
- CI/CD pipelines
- Security scanning
- Documentation
- Tutorials

## 🚦 Next Steps

Choose your path:

**Developer**: Start with `docs/TUTORIAL.md`
**DevOps**: Check `docs/DEPLOYMENT.md`
**Security**: Read `docs/SECURITY.md`
**Researcher**: Explore `ai/ml_evasion/`

---

**Version**: 2.0.0  
**Last Updated**: 2026-02-24  
**License**: See LICENSE file

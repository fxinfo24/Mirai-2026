# AI Agent Instructions - Mirai 2026

> **Purpose:** Comprehensive guide for AI assistants working on the Mirai 2026 security research platform.
>
> **Last Updated:** 2026-02-24
> **Project Version:** 2.0.0

---

## Project Overview

### Purpose
Mirai 2026 is a **modernized IoT security research platform** based on the original 2016 Mirai botnet source code. It combines classic botnet techniques with modern technologies (AI/ML, cloud-native infrastructure, observability) for **ethical security research and education only**.

### Technology Stack

**Core Languages:**
- **C (C17/C23)** - Performance-critical components (scanner, attack modules, bot)
- **Python 3.11+** - AI/ML services, data processing, API servers
- **Go** - C&C server (to be implemented)

**Frameworks & Libraries:**
- **C**: json-c, libsodium, epoll (async I/O)
- **Python**: TensorFlow, PyTorch, scikit-learn, Flask
- **Build**: CMake 3.20+, Make
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes (Kustomize), Terraform

**Infrastructure:**
- PostgreSQL 16 (database)
- Redis 7 (caching/queuing)
- Prometheus + Grafana (metrics)
- Loki (logs)
- Jaeger (tracing)

---

## Project Structure

### Key Directories

```
mirai-2026/
├── src/                    # Modern C codebase
│   ├── common/            # Shared utilities (logger, crypto, config)
│   ├── scanner/           # Network scanner (epoll-based)
│   ├── attack/            # Attack modules (UDP, TCP, HTTP floods)
│   ├── attacks_advanced/  # Advanced attacks (Slowloris, RUDY, DNS)
│   ├── evasion/           # Detection evasion engine
│   ├── update/            # Self-update mechanism
│   ├── ai_bridge/         # C ↔ Python AI communication
│   └── bot/               # Bot main logic
│
├── ai/                     # Python AI/ML services
│   ├── llm_integration/   # LLM API clients (OpenRouter, OpenAI, Claude, Ollama)
│   ├── credential_intel/  # Credential generation
│   ├── ml_evasion/        # ML-based evasion patterns
│   ├── deep_learning/     # DNN models
│   ├── reinforcement_learning/  # RL agents
│   ├── federated_learning/      # Distributed learning
│   ├── api_server.py      # Main AI API server
│   └── api_server_enhanced.py   # Enhanced with LLM integration
│
├── loader/                 # Legacy loader (C)
├── mirai/                  # Original 2016 code (reference)
│
├── tests/                  # Test suite
│   ├── unit/              # Unit tests (C)
│   └── integration/       # Integration tests
│
├── k8s/                    # Kubernetes manifests
│   ├── base/              # Base configs
│   └── overlays/          # Environment-specific (dev/prod)
│
├── terraform/              # Infrastructure as Code
│   └── modules/           # VPC, EKS, RDS, S3
│
├── docker/                 # Dockerfiles
├── observability/          # Monitoring configs
└── docs/                   # Documentation (organized)
    ├── guides/            # User guides
    ├── tutorials/         # Step-by-step tutorials
    ├── api/               # API documentation
    ├── deployment/        # Deployment guides
    ├── architecture/      # Design docs
    └── development/       # Development guides
```

### Critical Files

**Build System:**
- `CMakeLists.txt` - Main build configuration (C17, security flags, dependencies)
- `Makefile` - Convenience wrapper (release, debug, test, docker targets)
- `.clang-format` - Code formatting rules (LLVM style)

**Configuration:**
- `docker-compose.yml` - Local development stack
- `docker-compose.sandbox.yml` - Safe testing environment
- `config/bot.example.json` - Bot configuration template
- `ai/llm_integration/.env.example` - LLM API keys

**Documentation:**
- `README.md` - Primary entry point
- `README-2026.md` - Detailed project info
- `HANDOVER.md` - Complete handover guide
- `docs/README.md` - Master documentation index

---

## Development Workflow

### Getting Started

1. **Read documentation in this order:**
   - `README.md` (overview)
   - `docs/guides/GETTING_STARTED.md` (setup)
   - `docs/ARCHITECTURE.md` (design)
   - `HANDOVER.md` (complete context)

2. **Set up development environment:**
   ```bash
   # Install dependencies (Ubuntu/Debian)
   sudo apt-get install build-essential cmake git \
       libjson-c-dev libsodium-dev clang-format clang-tidy

   # Build debug version
   make debug

   # Run tests
   make test
   ```

3. **Start AI services:**
   ```bash
   cd ai
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install -r llm_integration/requirements.txt
   
   # Configure LLM API
   cp llm_integration/.env.example .env
   nano .env  # Add API keys
   
   # Test LLM integration
   python test_openrouter.py
   ```

4. **Run full stack locally:**
   ```bash
   docker-compose up -d
   ```

### Build Targets

```bash
make release         # Optimized production build
make debug           # Debug build with sanitizers
make test            # Run full test suite
make docker          # Build Docker images
make clean           # Remove build artifacts
make format          # Format code with clang-format
make lint            # Static analysis with clang-tidy
make install         # Install to system (requires sudo)
```

### Testing

**Unit Tests (C):**
```bash
cd build/debug
ctest --output-on-failure
```

**Integration Tests:**
```bash
make test
```

**AI Service Tests:**
```bash
cd ai
python -m pytest tests/
```

**Sandbox Testing:**
```bash
docker-compose -f docker-compose.sandbox.yml up
# Safe, isolated environment for testing
```

---

## Code Conventions

### C Code Standards

**Style:**
- Follow `.clang-format` (LLVM style, 4-space indent)
- Use `snake_case` for functions and variables
- Use `UPPER_CASE` for macros and constants
- Prefix types with `_t`: `scanner_t`, `attack_config_t`

**Best Practices:**
- **Modern C17/C23** - Use standard library features
- **Security first** - All compiler warnings as errors, stack protector, FORTIFY_SOURCE
- **Explicit error handling** - Always check return values
- **Memory safety** - Use AddressSanitizer during development
- **Thread safety** - Use pthread mutexes, avoid globals
- **Documentation** - Function-level comments explaining "why", not "what"

**Example:**
```c
/**
 * Initialize the scanner with epoll-based async I/O
 * 
 * @param max_connections Maximum concurrent connections (default: 256)
 * @return Pointer to scanner instance, or NULL on failure
 */
scanner_t *scanner_init(size_t max_connections);
```

**Security Flags (enforced):**
```
-Wall -Wextra -Wpedantic -Werror
-Wformat=2 -Wformat-security
-fstack-protector-strong
-D_FORTIFY_SOURCE=2
-pie -fPIE
```

### Python Code Standards

**Style:**
- Follow PEP 8
- Use `snake_case` for functions/variables
- Use `PascalCase` for classes
- Type hints for all functions

**Best Practices:**
- **Type annotations** - Use `typing` module
- **Docstrings** - Google or NumPy style
- **Error handling** - Explicit try/except with logging
- **Dependencies** - Pin versions in requirements.txt
- **Environment** - Use virtualenv, never system Python

**Example:**
```python
from typing import List, Optional

def generate_credentials(device_type: str, count: int = 10) -> List[dict]:
    """
    Generate likely credentials for IoT devices using LLM.
    
    Args:
        device_type: Type of device (router, camera, etc.)
        count: Number of credentials to generate
        
    Returns:
        List of credential dictionaries with 'username' and 'password'
        
    Raises:
        ValueError: If device_type is invalid
        APIError: If LLM API call fails
    """
    # Implementation
```

### Git Workflow

**Commit Messages (Conventional Commits):**
```
feat(scanner): add epoll-based async I/O
fix(attack): handle edge case in UDP flood
docs(api): update LLM integration guide
test(scanner): add unit tests for connection pooling
refactor(common): extract crypto utilities
```

**Branch Strategy:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates

**Pull Request Process:**
1. Run `make format` before committing
2. Ensure `make test` passes
3. Update documentation if needed
4. Reference issue number in PR description

---

## Architecture Principles

### 3-Layer Architecture

**Layer 1: Directives (What to do)**
- Configuration files, documentation
- Define goals, inputs, tools, outputs, edge cases

**Layer 2: Orchestration (Decision making)**
- Python AI services
- Intelligent routing, pattern recognition
- Can fail safely without affecting Layer 3

**Layer 3: Execution (Doing work)**
- C deterministic code
- Performance-critical operations
- 100% reliable, no probabilistic behavior

**Why?**
- Prevents error compounding in AI decisions
- C = speed + reliability, Python = intelligence + flexibility
- Best of both worlds

### Key Design Patterns

**Async I/O (C):**
- Use `epoll` for scalability (not select/poll)
- Non-blocking sockets
- Event-driven architecture

**Thread Safety:**
- Minimize shared state
- Use mutexes for critical sections
- Prefer message passing over shared memory

**Error Handling:**
```c
// Bad
char *result = risky_operation();
use(result);

// Good
char *result = risky_operation();
if (result == NULL) {
    log_error("risky_operation failed: %s", strerror(errno));
    return ERROR_CODE;
}
use(result);
```

**Resource Management:**
- Always pair init/cleanup functions
- Use RAII-like patterns where possible
- No memory leaks (verify with valgrind/AddressSanitizer)

### Module Boundaries

**Common Module** (`src/common/`):
- Shared utilities used everywhere
- NO business logic
- Examples: logging, config parsing, crypto, utilities

**Scanner Module** (`src/scanner/`):
- Network scanning only
- Depends on: common
- Used by: bot

**Attack Module** (`src/attack/`):
- Attack execution only
- Depends on: common
- Used by: bot

**AI Bridge** (`src/ai_bridge/`):
- C ↔ Python communication
- HTTP/JSON based
- Depends on: common, libcurl

---

## AI/ML Integration

### LLM Providers (via OpenRouter recommended)

**Supported APIs:**
1. **OpenRouter** (⭐ Recommended)
   - One API for 200+ models
   - Pay-as-you-go pricing
   - FREE models available (Llama2, Gemini, Mistral)
   - Endpoint: `https://openrouter.ai/api/v1`

2. **OpenAI** (GPT-4, GPT-3.5)
3. **Anthropic** (Claude 3)
4. **Ollama** (Local, FREE)
5. **Azure OpenAI**

**Configuration:**
```bash
# Copy template
cp ai/llm_integration/.env.example ai/llm_integration/.env

# Edit with your keys
export OPENROUTER_API_KEY='sk-or-v1-...'
export OPENROUTER_MODEL='openai/gpt-3.5-turbo'
```

**Usage Example:**
```python
from llm_integration.llm_client import LLMClient, LLMConfig, LLMProvider

client = LLMClient(LLMConfig(
    provider=LLMProvider.OPENROUTER,
    model="openai/gpt-3.5-turbo"
))

creds = client.generate_credentials("router", count=10)
```

### ML Models

**Reinforcement Learning:**
- Q-Learning agent for adaptive behavior
- Located: `ai/reinforcement_learning/`
- Learns from detection events

**Deep Learning:**
- DNN for pattern recognition and evasion
- Located: `ai/deep_learning/`
- TensorFlow/Keras based

**Federated Learning:**
- Distributed learning across bot network
- Located: `ai/federated_learning/`
- Privacy-preserving

---

## Infrastructure & Deployment

### Local Development

```bash
# Start all services
docker-compose up -d

# Access services
- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Jaeger UI: http://localhost:16686
- AI API: http://localhost:8000
- PostgreSQL: localhost:5432
```

### Kubernetes Deployment

**Environments:**
- `k8s/overlays/dev/` - Development (1 replica)
- `k8s/overlays/prod/` - Production (auto-scaling)

**Deploy:**
```bash
# Development
kubectl apply -k k8s/overlays/dev/

# Production
kubectl apply -k k8s/overlays/prod/

# Check status
kubectl get pods -n mirai-2026
```

### Terraform (AWS)

**Modules:**
- VPC with public/private subnets
- EKS cluster
- RDS PostgreSQL
- S3 for storage
- CloudWatch monitoring

**Usage:**
```bash
cd terraform/
terraform init
terraform plan
terraform apply
```

---

## Security & Ethics

### ⚠️ CRITICAL: Ethical Use Only

**LEGAL USE CASES:**
- ✅ Academic research in controlled environments
- ✅ Security training and education
- ✅ Penetration testing with authorization
- ✅ Honeypot development
- ✅ IoT security improvement

**ILLEGAL / PROHIBITED:**
- ❌ Unauthorized network scanning
- ❌ DDoS attacks on production systems
- ❌ Malware distribution
- ❌ Any malicious activity
- ❌ Violating computer fraud laws

**You are responsible for compliance with all applicable laws.**

### Security Best Practices

**Development:**
- Always use debug builds with sanitizers
- Never commit secrets to git
- Use `.env` files for credentials (gitignored)
- Run security scanners in CI/CD

**Deployment:**
- Isolated network segments
- Strong authentication
- Encrypted communication
- Regular security audits
- Kill switches implemented

---

## Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Missing dependencies
sudo apt-get install libjson-c-dev libsodium-dev

# CMake cache issues
rm -rf build/ && make debug

# Compiler version
gcc --version  # Need GCC 9+ for C17
```

**Python Issues:**
```bash
# Virtual environment
python3 -m venv venv
source venv/bin/activate

# Dependency conflicts
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

**LLM API Issues:**
```bash
# Test connection
python ai/test_openrouter.py

# Check API key
env | grep OPENROUTER

# Rate limits
# OpenRouter has generous limits, but paid models may vary
```

**Docker Issues:**
```bash
# Clean rebuild
docker-compose down -v
docker system prune -a
docker-compose up --build
```

---

## Performance Optimization

### C Code

**Scanner:**
- Use epoll (NOT select/poll) - handles 100k+ connections
- Connection pooling - reuse sockets
- Batch operations - reduce syscalls

**Attack Modules:**
- Thread pool - avoid thread creation overhead
- Lock-free queues - reduce contention
- CPU pinning - reduce cache misses

**Memory:**
- Arena allocation for short-lived objects
- Object pools for frequently allocated types
- Avoid malloc in hot paths

### Python Code

**API Server:**
- Use async/await (aiohttp)
- Connection pooling (SQLAlchemy)
- Caching (Redis)
- Rate limiting

**ML Models:**
- Batch inference
- GPU acceleration (if available)
- Model quantization for deployment
- Caching predictions

---

## Testing Strategy

### Unit Tests (C)

**Location:** `tests/unit/`

**Framework:** Custom (lightweight)

**Coverage Target:** 80%+

**Run:**
```bash
make test
```

### Integration Tests

**Location:** `tests/integration/`

**Tests:**
- Full stack communication
- C ↔ Python bridge
- Database interactions
- API endpoints

### AI Model Tests

**Location:** `ai/tests/`

**Tests:**
- Model accuracy
- API response validation
- Edge case handling

### Sandbox Testing

**Safe environment for live testing:**
```bash
cd docs/tutorials/live_demo/
./sandbox_environment.sh
```

---

## Observability

### Metrics (Prometheus)

**Bot Metrics:**
- `mirai_scanner_connections_active` - Active scanner connections
- `mirai_scanner_scan_rate` - Scans per second
- `mirai_attack_active` - Active attacks
- `mirai_detection_events` - Detection events

**AI Metrics:**
- `ai_llm_requests_total` - LLM API calls
- `ai_llm_latency_seconds` - LLM response time
- `ai_model_inference_duration` - Model inference time

**Access:** http://localhost:9090

### Dashboards (Grafana)

**Pre-built dashboards:**
- Bot Metrics (`observability/grafana/dashboard_bot_metrics.json`)
- Detection Events (`observability/grafana/dashboard_detection_events.json`)
- System Health

**Access:** http://localhost:3000 (admin/admin)

### Logging

**C Code:**
```c
log_info("Scanner initialized: max_conn=%zu", max_conn);
log_error("Connection failed: %s", strerror(errno));
log_debug("Processing packet: src=%s", src_ip);
```

**Python Code:**
```python
import logging
logger = logging.getLogger(__name__)

logger.info("LLM request", extra={"model": model, "tokens": tokens})
logger.error("API call failed", exc_info=True)
```

**Aggregation:** Loki (http://localhost:3100)

---

## Documentation

### Structure

**Start here:** `docs/README.md` (Master index)

**Categories:**
- `docs/guides/` - User guides, quick reference, cheat sheets
- `docs/tutorials/` - Step-by-step interactive tutorials
- `docs/api/` - API documentation (LLM, REST APIs)
- `docs/deployment/` - Docker, Kubernetes, Terraform
- `docs/architecture/` - Design documents, ADRs
- `docs/development/` - Contributing, build system, phases

### Documentation Standards

**All code changes require:**
- Function-level comments (C)
- Docstrings (Python)
- Update relevant docs in `docs/`
- Add examples if new feature

**Markdown Style:**
- Use ATX headers (`#` not `===`)
- Code blocks with language tags
- Cross-reference other docs with relative links
- Include "See also" sections

---

## CI/CD Pipeline

### GitHub Actions

**Workflows:**
- `.github/workflows/ci.yml` - Build, test, lint
- `.github/workflows/security-scan.yml` - Security scanning

**On Push:**
1. Code formatting check
2. Build (debug + release)
3. Run test suite
4. Static analysis
5. Security scan
6. Build Docker images

**On PR:**
- All above checks must pass
- Code review required
- Documentation check

---

## Quick Reference

### Most Used Commands

```bash
# Build
make release              # Production build
make debug                # Debug build with sanitizers
make test                 # Run tests

# Code Quality
make format               # Format code
make lint                 # Static analysis

# Docker
docker-compose up -d      # Start services
docker-compose logs -f    # View logs
docker-compose down       # Stop services

# Kubernetes
kubectl apply -k k8s/overlays/dev/
kubectl get pods -n mirai-2026
kubectl logs -f <pod-name>

# Python
source ai/venv/bin/activate
pip install -r ai/requirements.txt
python ai/test_openrouter.py
```

### Important URLs

- **Documentation:** `docs/README.md`
- **Architecture:** `docs/ARCHITECTURE.md`
- **Handover:** `HANDOVER.md`
- **Quick Start:** `docs/guides/QUICKSTART.md`
- **LLM Guide:** `docs/api/LLM_INTEGRATION.md`
- **OpenRouter:** https://openrouter.ai/

---

## Changelog & Versioning

### Current Version: 2.0.0

**Semantic Versioning:**
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

**See:** `CHANGELOG.md` for complete history

---

## Contact & Support

### Resources

- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions
- **Documentation:** `docs/README.md`
- **Handover:** `HANDOVER.md`

### Getting Help

1. Check `docs/guides/QUICK_REFERENCE.md`
2. Search existing issues
3. Read `docs/guides/DECISION_TREE.md`
4. Ask in discussions

---

## Agent-Specific Instructions

### For AI Assistants Working on This Project

**Always:**
1. Read `HANDOVER.md` for complete project context
2. Check `docs/ARCHITECTURE.md` before suggesting changes
3. Follow the 3-layer architecture (C=execution, Python=orchestration)
4. Run `make format` and `make test` before suggesting code changes
5. Update documentation when changing code
6. Consider security implications of all changes
7. Respect the ethical use constraints

**Code Changes:**
- Prefer modifying existing modules over creating new ones
- Maintain backward compatibility where possible
- Add tests for new features
- Follow existing code style (clang-format for C, PEP 8 for Python)

**When Uncertain:**
- Ask for clarification
- Reference documentation
- Suggest options rather than making assumptions
- Highlight security/ethical concerns

**File Organization:**
- Keep root directory minimal (5-6 essential docs)
- Put phase summaries in `docs/development/phases/`
- Archive historical docs in `docs/development/archive/`
- All new docs go in appropriate `docs/` subdirectory

---

**Last Updated:** 2026-02-24  
**Version:** 2.0.0  
**Maintained By:** Project maintainers

*"Build secure systems by understanding insecure ones"*

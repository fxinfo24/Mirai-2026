# Interactive Tutorial 1: Getting Started with Mirai 2026

## Welcome! 🎉

This is an interactive tutorial that will walk you through the Mirai 2026 research platform step-by-step.

**Time**: ~30 minutes  
**Prerequisites**: Docker, basic command line knowledge  
**Goal**: Build, run, and understand the basic architecture

---

## Step 1: Clone and Explore (5 minutes)

### 1.1 Clone the Repository

```bash
git clone https://github.com/yourorg/mirai-2026.git
cd mirai-2026
```

### 1.2 Explore the Structure

```bash
# View the project structure
tree -L 2 -I 'node_modules|venv|.git'

# Or use ls
ls -la
```

**What you should see**:
- `src/` - C source code (bot, scanner, attacks)
- `ai/` - Python AI services
- `k8s/` - Kubernetes deployments
- `terraform/` - Infrastructure as code
- `docs/` - Documentation

### 1.3 Check Prerequisites

```bash
# Check Docker
docker --version
# Should show: Docker version 20.x.x or higher

# Check Docker Compose
docker-compose --version
# Should show: docker-compose version 1.29.x or higher

# Check CMake (for building from source)
cmake --version
# Should show: cmake version 3.20 or higher
```

✅ **Checkpoint**: You should have Docker, Docker Compose, and (optionally) CMake installed.

---

## Step 2: Quick Start with Docker Compose (10 minutes)

### 2.1 Start All Services

```bash
# Start the complete stack
docker-compose up -d

# Check status
docker-compose ps
```

**Expected output**:
```
NAME                STATUS              PORTS
mirai-bot           running            0.0.0.0:9090->9090/tcp
mirai-ai-service    running            0.0.0.0:5000->5000/tcp
mirai-postgres      running            5432/tcp
mirai-prometheus    running            0.0.0.0:9091->9090/tcp
mirai-grafana       running            0.0.0.0:3000->3000/tcp
```

### 2.2 Verify Services Are Running

```bash
# Test AI API
curl http://localhost:5000/health

# Expected: {"status":"healthy","services":{...}}

# Test Prometheus metrics
curl http://localhost:9090/metrics | head -20

# Test Grafana (in browser)
# Open: http://localhost:3000
# Default login: admin / admin
```

### 2.3 View Logs

```bash
# Follow logs from all services
docker-compose logs -f

# Or specific service
docker-compose logs -f ai-service

# Press Ctrl+C to stop following
```

✅ **Checkpoint**: All services should be running and accessible.

---

## Step 3: Understanding the Architecture (5 minutes)

### 3.1 The Components

Open `docs/ARCHITECTURE.md` in your editor:

```bash
cat docs/ARCHITECTURE.md
```

**Key components**:
1. **Bot** (C) - Scanner + Attack modules
2. **AI Service** (Python) - ML models + API
3. **PostgreSQL** - Database for state
4. **Prometheus** - Metrics collection
5. **Grafana** - Visualization

### 3.2 The Data Flow

```
Bot (C) → Metrics → Prometheus → Grafana (Visualization)
   ↓
   AI API (Python) → ML Models → Decision
   ↑
   Results sent back to Bot
```

### 3.3 View the Configuration

```bash
# Bot configuration
cat config/bot.example.json

# Docker Compose configuration
cat docker-compose.yml

# Kubernetes configuration (for production)
ls k8s/base/
```

✅ **Checkpoint**: You understand the architecture and component roles.

---

## Step 4: Interacting with the AI Service (5 minutes)

### 4.1 Generate Credentials with AI

```bash
# Request credential generation
curl -X POST http://localhost:5000/api/credentials/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target_device": "IoT Camera",
    "target_os": "Linux",
    "max_credentials": 10
  }'
```

**Expected output**: JSON with generated credentials

### 4.2 Get Evasion Suggestions

```bash
# Request evasion techniques
curl -X POST http://localhost:5000/api/evasion/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "current_pattern": {
      "payload_entropy": 0.5,
      "fragmentation": false,
      "inter_packet_delay_ms": 0
    },
    "max_suggestions": 5
  }'
```

**Expected output**: List of evasion suggestions

### 4.3 Check Current Attack Pattern

```bash
# Get current best pattern
curl http://localhost:5000/api/pattern/current
```

✅ **Checkpoint**: You can interact with the AI service API.

---

## Step 5: Monitoring with Grafana (5 minutes)

### 5.1 Access Dashboards

Open your browser to: http://localhost:3000

- **Username**: admin
- **Password**: admin (change on first login)

### 5.2 View Bot Metrics Dashboard

1. Click "Dashboards" → "Browse"
2. Select "Mirai 2026 - Bot Performance Dashboard"

**Metrics you should see**:
- Attack success rate
- Active connections
- Packets sent/received
- Detection events
- AI agent performance

### 5.3 View Detection Dashboard

1. Go to "Dashboards" → "Browse"
2. Select "Mirai 2026 - Detection & Evasion Dashboard"

**Metrics you should see**:
- Detection event timeline
- Evasion actions triggered
- Time since last detection
- Polymorphic transformations

✅ **Checkpoint**: You can view real-time metrics in Grafana.

---

## Step 6: Building from Source (Optional, 10 minutes)

### 6.1 Install Dependencies

**Ubuntu/Debian**:
```bash
sudo apt-get update
sudo apt-get install -y \
    cmake ninja-build \
    libjson-c-dev libsodium-dev libcurl4-openssl-dev \
    python3 python3-pip
```

**macOS**:
```bash
brew install cmake ninja json-c libsodium curl
```

### 6.2 Build the Project

```bash
# Configure
cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_TESTS=ON

# Build
cmake --build build --parallel

# Run tests
cd build
ctest --output-on-failure
```

### 6.3 Run the Bot

```bash
# From build directory
./src/bot/mirai_bot --config ../config/bot.example.json
```

✅ **Checkpoint**: You've successfully built from source.

---

## Step 7: Cleanup

When you're done:

```bash
# Stop all services
docker-compose down

# Remove volumes (CAUTION: deletes data)
docker-compose down -v

# If built from source, clean build
rm -rf build/
```

---

## What's Next?

Now that you've completed the basics, try:

📚 **Tutorial 2**: Understanding Detection Evasion  
📚 **Tutorial 3**: Training the RL Agent  
📚 **Tutorial 4**: Deploying to Kubernetes  
📚 **Tutorial 5**: Advanced Attack Vectors  

---

## Quick Reference

### Useful Commands

```bash
# View all services
docker-compose ps

# Restart a service
docker-compose restart ai-service

# View resource usage
docker stats

# Access service shell
docker-compose exec bot /bin/sh

# View Prometheus targets
open http://localhost:9091/targets

# View Grafana
open http://localhost:3000
```

### Useful URLs

- AI Service: http://localhost:5000
- Prometheus: http://localhost:9091
- Grafana: http://localhost:3000
- Bot Metrics: http://localhost:9090/metrics

---

## Troubleshooting

**Service won't start?**
```bash
# Check logs
docker-compose logs service-name

# Restart service
docker-compose restart service-name
```

**Port already in use?**
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 PID
```

**Build errors?**
```bash
# Clean and rebuild
rm -rf build
cmake -B build ...
```

---

## Summary

Congratulations! You've:
✅ Installed and ran Mirai 2026  
✅ Understood the architecture  
✅ Interacted with the AI service  
✅ Viewed metrics in Grafana  
✅ (Optional) Built from source  

**Next**: [Tutorial 2: Understanding Detection Evasion →](02_detection_evasion.md)

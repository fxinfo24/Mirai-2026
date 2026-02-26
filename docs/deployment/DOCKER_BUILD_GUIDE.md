# Mirai 2026 — Comprehensive Docker Build & Deploy Guide

> **Purpose:** Complete, confusion-free guide to deploy Mirai 2026 from scratch at any time.  
> **Last Updated:** February 27, 2026 | **Version:** 2.9.3  
> **Time to deploy:** ~5 minutes (first run: ~15 min for image pulls/builds)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start (TL;DR)](#2-quick-start-tldr)
3. [Environment Setup](#3-environment-setup)
4. [Service Architecture](#4-service-architecture)
5. [Full Stack Deployment](#5-full-stack-deployment)
6. [Individual Service Commands](#6-individual-service-commands)
7. [Verification Checklist](#7-verification-checklist)
8. [Rebuild From Scratch](#8-rebuild-from-scratch)
9. [Troubleshooting](#9-troubleshooting)
10. [Production Notes](#10-production-notes)

---

## 1. Prerequisites

### Required software
```bash
# Verify all prerequisites are installed
docker --version          # Docker 24.0+ required
docker-compose --version  # Docker Compose v2.20+ required
git --version             # Git 2.30+
```

### System requirements
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4GB | 8GB+ |
| Disk | 10GB free | 20GB+ |
| CPU | 2 cores | 4+ cores |
| OS | Linux / macOS / WSL2 | Ubuntu 22.04 LTS |

### Install Docker (if needed)
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# macOS — install Docker Desktop from https://docker.com/products/docker-desktop
```

---

## 2. Quick Start (TL;DR)

```bash
# 1. Clone
git clone https://github.com/fxinfo24/Mirai-2026.git
cd Mirai-2026

# 2. Configure
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and JWT_SECRET at minimum (see section 3)

# 3. Start everything
docker-compose up -d

# 4. Verify (wait ~30s for services to start)
docker-compose ps                          # all services = "healthy" or "running"
curl http://localhost:8080/api/health      # CNC: {"status":"ok"}
curl http://localhost:8001/health          # AI service: {"status":"ok"}
open http://localhost:3002                 # Dashboard
open http://localhost:3004                 # Grafana (admin/admin)
open http://localhost:9090                 # Prometheus
```

**Done.** All 8 services are running.

---

## 3. Environment Setup

### Step 1: Copy the environment template
```bash
cp .env.example .env
```

### Step 2: Edit `.env` — minimum required changes
```bash
# Open with your preferred editor
nano .env    # or: vim .env / code .env
```

**Required values to change:**
```env
# Database — change this password!
POSTGRES_PASSWORD=your_strong_password_here

# CNC JWT secret — change this for security!
JWT_SECRET=your_random_64_char_secret_here

# Optional: LLM API key for AI credential generation
OPENROUTER_API_KEY=sk-or-v1-...
```

**Generate a secure JWT secret:**
```bash
openssl rand -hex 32
# Example output: a3f8d2c1e5b7f9a2d4c6e8f0b2d4a6c8e0f2b4d6a8c0e2f4b6d8a0c2e4f6b8
```

### Full `.env` reference
```env
# ── Database ─────────────────────────────────────────────────────────────────
POSTGRES_DB=mirai
POSTGRES_USER=mirai
POSTGRES_PASSWORD=CHANGE_ME_strong_password      # ← REQUIRED

# ── Security ─────────────────────────────────────────────────────────────────
JWT_SECRET=CHANGE_ME_random_64_char_hex          # ← REQUIRED
SECRET_KEY=CHANGE_ME_random_32_char_hex          # Flask secret key

# ── CNC Server ───────────────────────────────────────────────────────────────
BOT_PORT=23
API_PORT=8080
REDIS_URL=redis://redis:6379/0

# ── AI Service ───────────────────────────────────────────────────────────────
AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_PORT=8000

# ── LLM API Keys (optional — AI features work without these) ─────────────────
OPENROUTER_API_KEY=                   # https://openrouter.ai (recommended)
OPENROUTER_MODEL=openai/gpt-3.5-turbo
OPENAI_API_KEY=                       # alternative
ANTHROPIC_API_KEY=                    # alternative

# ── Dashboard ────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET=CHANGE_ME_random_secret
NEXTAUTH_URL=http://localhost:3002
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
CNC_API_URL=http://localhost:8080
```

---

## 4. Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Docker Network: mirai-net                         │
│                                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │  Dashboard   │    │  CNC Server  │    │      AI Service          │   │
│  │  (Next.js)   │───▶│   (Go)       │    │      (Python/Flask)      │   │
│  │  port 3002   │    │  8080 (API)  │    │      port 8001           │   │
│  └──────────────┘    │  23 (bots)   │    └──────────────────────────┘   │
│                      └──────┬───────┘              │                     │
│                             │                      │                     │
│                    ┌────────▼──────────────────────▼──────┐             │
│                    │           PostgreSQL 16               │             │
│                    │           port 5433 (host)            │             │
│                    └──────────────────────────────────────┘             │
│                             │                                            │
│                    ┌────────▼──────┐                                     │
│                    │  Redis 7      │                                     │
│                    │  port 6380    │ ← Rate-limit state, caching         │
│                    └───────────────┘                                     │
│                                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐       │
│  │ Prometheus │  │  Grafana   │  │   Loki     │  │   Jaeger    │       │
│  │ port 9090  │  │ port 3004  │  │ port 3100  │  │ port 16686  │       │
│  └────────────┘  └────────────┘  └────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Service summary

| Service | Image | Host Port | Internal Port | Purpose |
|---------|-------|-----------|---------------|---------|
| `postgres` | postgres:16-alpine | 5433 | 5432 | CNC database |
| `redis` | redis:7-alpine | 6380 | 6379 | Rate-limit cache |
| `prometheus` | prom/prometheus | 9090 | 9090 | Metrics |
| `grafana` | grafana/grafana | 3004 | 3000 | Dashboards |
| `loki` | grafana/loki | 3100 | 3100 | Log aggregation |
| `jaeger` | jaegertracing/all-in-one | 16686 | 16686 | Tracing UI |
| `ai-service` | custom (Dockerfile.ai) | 8001 | 8000 | Python ML/LLM |
| `cnc` | custom (Dockerfile.cnc) | 8080, 23 | 8080, 23 | Go CNC server |
| `dashboard` | custom (Dockerfile.dashboard) | 3002 | 3000 | Next.js UI |

---

## 5. Full Stack Deployment

### Option A: Development (with hot-reload)
```bash
docker-compose up -d
```
- Dashboard has hot-reload via volume mounts
- All source changes in `ai/` and `dashboard/src/` reflect immediately

### Option B: Production build (optimized images)
```bash
# Build all images fresh
docker-compose build --no-cache

# Start in detached mode
docker-compose up -d

# Follow logs to confirm healthy startup
docker-compose logs -f --tail=50
```

### Option C: Sandbox (safe isolated testing)
```bash
# Create the required external network first
docker network create mirai-sandbox

# Start minimal 4-service sandbox
docker-compose -f docker-compose.sandbox.yml up -d
```

### Option D: Core only (no dashboard)
```bash
docker-compose -f docker-compose.dev.yml up -d
```
Starts 8 services (no dashboard). CNC on port 2323, Grafana on port 3002.

---

## 6. Individual Service Commands

### Start/stop specific services
```bash
# Start just the CNC (and its dependencies: postgres, redis)
docker-compose up -d cnc

# Restart just the CNC (e.g. after config change)
docker-compose restart cnc

# Stop a specific service
docker-compose stop dashboard

# View logs for a specific service
docker-compose logs -f cnc
docker-compose logs -f ai-service --tail=100
```

### Rebuild a specific service
```bash
# Rebuild CNC after code changes
docker-compose build --no-cache cnc
docker-compose up -d cnc

# Rebuild dashboard
docker-compose build --no-cache dashboard
docker-compose up -d dashboard

# Rebuild AI service
docker-compose build --no-cache ai-service
docker-compose up -d ai-service
```

### Database operations
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U mirai -d mirai

# Run a SQL file
docker-compose exec -T postgres psql -U mirai -d mirai < path/to/file.sql

# Backup database
docker-compose exec postgres pg_dump -U mirai mirai > backup_$(date +%Y%m%d).sql

# Restore database
docker-compose exec -T postgres psql -U mirai -d mirai < backup.sql
```

### Redis operations
```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check rate-limit state for an IP
docker-compose exec redis redis-cli KEYS "cnc:ratelimit:*"
docker-compose exec redis redis-cli GET "cnc:ratelimit:lockout:192.168.1.1"

# Clear all rate-limit lockouts (emergency)
docker-compose exec redis redis-cli KEYS "cnc:ratelimit:*" | xargs docker-compose exec -T redis redis-cli DEL
```

---

## 7. Verification Checklist

Run this after every fresh deployment to confirm everything works:

```bash
#!/bin/bash
echo "=== Mirai 2026 Deployment Verification ==="

# 1. All containers running
echo "1. Container status:"
docker-compose ps

# 2. CNC health
echo ""
echo "2. CNC REST API:"
curl -sf http://localhost:8080/api/health && echo " ✅ CNC healthy" || echo " ❌ CNC unreachable"

# 3. CNC authentication
echo "3. CNC auth:"
TOKEN=$(curl -sf -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','FAIL'))")
[ "$TOKEN" != "FAIL" ] && echo " ✅ JWT auth working" || echo " ❌ Auth failed"

# 4. AI service
echo "4. AI service:"
curl -sf http://localhost:8001/health && echo " ✅ AI service healthy" || echo " ❌ AI service unreachable"

# 5. Dashboard
echo "5. Dashboard:"
curl -sf http://localhost:3002 > /dev/null && echo " ✅ Dashboard serving" || echo " ❌ Dashboard unreachable"

# 6. Prometheus
echo "6. Prometheus:"
curl -sf http://localhost:9090/-/healthy && echo " ✅ Prometheus healthy" || echo " ❌ Prometheus unreachable"

# 7. Grafana
echo "7. Grafana:"
curl -sf http://localhost:3004/api/health > /dev/null && echo " ✅ Grafana healthy" || echo " ❌ Grafana unreachable"

# 8. Redis rate-limit
echo "8. Redis:"
docker-compose exec -T redis redis-cli ping | grep -q PONG && echo " ✅ Redis responding" || echo " ❌ Redis unreachable"

# 9. PostgreSQL
echo "9. PostgreSQL:"
docker-compose exec -T postgres pg_isready -U mirai | grep -q "accepting" && echo " ✅ PostgreSQL ready" || echo " ❌ PostgreSQL unreachable"

echo ""
echo "=== Integration Tests ==="
echo "Run: CNC_API_URL=http://localhost:8080 python3 -m pytest tests/integration/test_ethical_safeguards.py -k 'not TestCNCRateLimitLockout' -q"
```

Save as `docs/deployment/verify_deployment.sh` (already included) and run with `bash docs/deployment/verify_deployment.sh`.

### Access URLs after deployment

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:3002 | admin / admin |
| CNC REST API | http://localhost:8080/api/health | — |
| Grafana | http://localhost:3004 | admin / admin |
| Prometheus | http://localhost:9090 | — |
| Jaeger UI | http://localhost:16686 | — |
| AI Service | http://localhost:8001/health | — |

---

## 8. Rebuild From Scratch

Use this when you need a completely clean rebuild (corrupted state, major code changes, etc.):

### Nuclear option (destroys ALL data)
```bash
# ⚠️  WARNING: This deletes all data including database volumes
docker-compose down -v --remove-orphans

# Remove all built images
docker rmi $(docker images | grep "mirai-2026\|mirai-cnc\|mirai-ai" | awk '{print $3}') 2>/dev/null || true

# Remove dangling images/cache
docker system prune -f

# Rebuild everything fresh
docker-compose build --no-cache

# Start fresh
docker-compose up -d

# Wait for healthy status (~30 seconds)
sleep 30 && docker-compose ps
```

### Soft reset (keeps database data)
```bash
# Stop services, keep volumes
docker-compose down

# Rebuild only changed images
docker-compose build

# Restart
docker-compose up -d
```

### Reset just the CNC (most common)
```bash
# Rebuild CNC image (after code changes to mirai/cnc/cnc_modern.go)
docker-compose build --no-cache cnc

# Restart CNC only — Redis rate-limit state persists across CNC restarts
docker-compose up -d cnc

# Verify
curl http://localhost:8080/api/health
docker-compose logs --tail=10 cnc | grep -E "redis|starting|listening"
```

---

## 9. Troubleshooting

### CNC won't start
```bash
# Check logs
docker-compose logs cnc

# Common issues:
# 1. Port 23 requires root on Linux — check BOT_PORT env var
#    Fix: set BOT_PORT=2323 in .env (no root needed for ports >1024)

# 2. PostgreSQL not ready yet
#    Fix: wait 10s, run: docker-compose restart cnc

# 3. JWT_SECRET not set
#    Fix: add JWT_SECRET=... to .env
```

### Dashboard shows runtime error (`toLocaleString` on undefined)
```bash
# This was fixed in v2.9.1 — ensure you have latest code
git pull origin main
docker-compose build --no-cache dashboard
docker-compose up -d dashboard
```

### Redis not persisting rate-limit state
```bash
# Check CNC startup log for Redis connection
docker-compose logs cnc | grep -i redis
# Should show: "Redis connected — rate-limit state is persistent"
# If shows: "Redis unreachable — rate-limit falling back to in-memory"
# → Check REDIS_URL env var: should be redis://redis:6379

# Check docker-compose.yml CNC environment section
grep -A 20 "^  cnc:" docker-compose.yml | grep REDIS
```

### AI service failing to start
```bash
docker-compose logs ai-service

# Common issues:
# 1. Missing Python packages
#    Fix: docker-compose build --no-cache ai-service

# 2. LLM API key invalid (optional feature — AI works without it)
#    Fix: check OPENROUTER_API_KEY in .env, or leave empty

# 3. Port 8001 already in use
#    Fix: lsof -i :8001 then kill the process
```

### Dashboard can't reach CNC
```bash
# Check dashboard .env.local
cat dashboard/.env.local | grep CNC_API_URL

# Should be: CNC_API_URL=http://localhost:8080
# If missing: create dashboard/.env.local with the above line

# Also check: NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### PostgreSQL connection refused
```bash
# PostgreSQL uses port 5433 on host (not standard 5432)
docker-compose exec postgres pg_isready -U mirai

# If failing, check if another PostgreSQL is using port 5433
lsof -i :5433

# Wait for PostgreSQL to be fully ready (can take 10-15s on first start)
docker-compose logs postgres | tail -5
```

### Port conflicts
```bash
# Check which ports are in use
lsof -i :8080 -i :3002 -i :5433 -i :6380 -i :9090 -i :3004 2>/dev/null

# Port mapping in docker-compose.yml:
# 5433  → PostgreSQL (not 5432 to avoid conflicts)
# 6380  → Redis (not 6379)
# 3002  → Dashboard (not 3000 to avoid conflicts with Grafana dev)
# 3004  → Grafana
# 8080  → CNC REST API
# 8001  → AI Service
# 9090  → Prometheus
```

### Docker build cache issues
```bash
# If a build succeeds but runs old code:
docker-compose build --no-cache <service>

# Nuclear cache clear:
docker builder prune -f
docker system prune -f
```

### "no space left on device"
```bash
docker system df          # Show disk usage
docker system prune -af   # Remove all unused images, containers, volumes
docker volume prune -f    # Remove unused volumes (⚠️ data loss)
```

---

## 10. Production Notes

### Security hardening before production
```bash
# 1. Change all default passwords in .env
#    - POSTGRES_PASSWORD (must be strong)
#    - JWT_SECRET (must be 64+ random hex chars)
#    - SECRET_KEY (Flask secret)

# 2. Change default CNC credentials
#    Edit mirai/cnc/cnc_modern.go — search for "admin"/"operator" users
#    Rebuild CNC after change: docker-compose build --no-cache cnc

# 3. Restrict Grafana admin password
#    Add to docker-compose.yml grafana environment:
#    GF_SECURITY_ADMIN_PASSWORD: your_strong_password

# 4. Disable debug mode
#    Set FLASK_DEBUG=False in .env (already default)
```

### Resource limits (add to docker-compose.yml for production)
```yaml
# Example for CNC service
cnc:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 128M
```

### Health check timing
All services have health checks configured. On first start, allow:
- PostgreSQL: 10-15 seconds
- Redis: 2-3 seconds
- CNC: 5-10 seconds (waits for PostgreSQL)
- AI service: 15-30 seconds (Python startup)
- Dashboard: 20-30 seconds (Next.js compilation)

```bash
# Wait for all services to be healthy
watch -n 2 'docker-compose ps'
```

### Useful monitoring commands
```bash
# Resource usage
docker stats

# Container events
docker-compose events

# All logs at once
docker-compose logs -f

# Specific service logs with timestamps
docker-compose logs -f --timestamps cnc
```

### Updating to a new version
```bash
git pull origin main

# If go.mod changed (new Go dependencies):
cd mirai/cnc && go mod download && cd ../..

# Rebuild affected services
docker-compose build --no-cache cnc ai-service dashboard

# Rolling restart (keeps other services running)
docker-compose up -d --no-deps cnc
docker-compose up -d --no-deps ai-service
docker-compose up -d --no-deps dashboard
```

---

## Quick Reference Card

```bash
# ── Start / Stop ────────────────────────────────────────────────────────────
docker-compose up -d                    # Start all
docker-compose down                     # Stop all (keep data)
docker-compose down -v                  # Stop + DELETE all data

# ── Status ──────────────────────────────────────────────────────────────────
docker-compose ps                       # Container status
docker stats                            # Resource usage
docker-compose logs -f <service>        # Live logs

# ── Rebuild ─────────────────────────────────────────────────────────────────
docker-compose build --no-cache <svc>  # Rebuild one service
docker-compose up -d --no-deps <svc>   # Restart one service
docker-compose build --no-cache        # Rebuild all

# ── Verify ──────────────────────────────────────────────────────────────────
curl http://localhost:8080/api/health   # CNC
curl http://localhost:8001/health       # AI service
curl http://localhost:3002              # Dashboard

# ── Integration tests ────────────────────────────────────────────────────────
CNC_API_URL=http://localhost:8080 python3 -m pytest \
  tests/integration/test_ethical_safeguards.py \
  -k "not TestCNCRateLimitLockout" -q

# ── Nuclear reset ────────────────────────────────────────────────────────────
docker-compose down -v --remove-orphans && docker system prune -f && \
docker-compose build --no-cache && docker-compose up -d
```

---

*Last Updated: February 27, 2026 | Version: 2.9.3*  
*See also: [KUBERNETES.md](KUBERNETES.md) | [GETTING_STARTED.md](../guides/GETTING_STARTED.md) | [HANDOVER.md](../../HANDOVER.md)*

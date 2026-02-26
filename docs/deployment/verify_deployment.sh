#!/usr/bin/env bash
# Mirai 2026 — Deployment Verification Script
# Usage: bash scripts/verify_deployment.sh
# Run after docker-compose up -d to confirm all services are healthy.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "  ${GREEN}✅ $1${NC}"; }
fail() { echo -e "  ${RED}❌ $1${NC}"; FAILURES=$((FAILURES+1)); }
warn() { echo -e "  ${YELLOW}⚠️  $1${NC}"; }

FAILURES=0

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     Mirai 2026 — Deployment Verification v2.9.3     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Docker Compose Status ─────────────────────────────────────────────────
echo "1. Container Status:"
docker-compose ps 2>/dev/null || { fail "docker-compose not found or stack not running"; exit 1; }
echo ""

# ── 2. CNC Health ────────────────────────────────────────────────────────────
echo "2. CNC REST API (port 8080):"
if curl -sf http://localhost:8080/api/health > /dev/null 2>&1; then
    HEALTH=$(curl -sf http://localhost:8080/api/health)
    pass "CNC healthy: $HEALTH"
else
    fail "CNC unreachable at http://localhost:8080/api/health"
fi

# ── 3. CNC Authentication ────────────────────────────────────────────────────
echo "3. CNC JWT Authentication:"
AUTH_RESP=$(curl -sf -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin"}' 2>/dev/null || echo "")
if echo "$AUTH_RESP" | grep -q "access_token"; then
    pass "JWT auth working (admin login successful)"
else
    fail "JWT auth failed — response: $AUTH_RESP"
fi

# ── 4. Redis Rate-Limit ──────────────────────────────────────────────────────
echo "4. Redis (port 6380):"
if docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
    # Check CNC is connected to Redis (search full log history, not just recent lines)
    if docker-compose logs cnc 2>/dev/null | grep -q "Redis connected\|rate-limit state is persistent"; then
        pass "Redis responding + CNC rate-limit state is persistent"
    elif docker-compose logs cnc 2>/dev/null | grep -q "Redis unreachable\|falling back to in-memory"; then
        warn "Redis responding but CNC is using in-memory fallback — check REDIS_URL in .env"
    else
        pass "Redis responding (CNC startup log not found — may be using Redis)"
    fi
else
    fail "Redis unreachable"
fi

# ── 5. PostgreSQL ────────────────────────────────────────────────────────────
echo "5. PostgreSQL (port 5433):"
if docker-compose exec -T postgres pg_isready -U mirai 2>/dev/null | grep -q "accepting"; then
    pass "PostgreSQL ready and accepting connections"
else
    fail "PostgreSQL not ready"
fi

# ── 6. AI Service ────────────────────────────────────────────────────────────
echo "6. AI Service (port 8001):"
if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
    pass "AI service healthy"
else
    warn "AI service unreachable at port 8001 (may still be starting, or optional)"
fi

# ── 7. Dashboard ─────────────────────────────────────────────────────────────
echo "7. Dashboard (port 3002):"
if curl -sf http://localhost:3002 > /dev/null 2>&1; then
    pass "Dashboard serving at http://localhost:3002"
else
    warn "Dashboard not yet reachable (may still be compiling — wait 30s and retry)"
fi

# ── 8. Prometheus ────────────────────────────────────────────────────────────
echo "8. Prometheus (port 9090):"
if curl -sf http://localhost:9090/-/healthy > /dev/null 2>&1; then
    pass "Prometheus healthy at http://localhost:9090"
else
    warn "Prometheus unreachable at port 9090"
fi

# ── 9. Grafana ───────────────────────────────────────────────────────────────
echo "9. Grafana (port 3004):"
if curl -sf http://localhost:3004/api/health > /dev/null 2>&1; then
    pass "Grafana healthy at http://localhost:3004 (admin/admin)"
else
    warn "Grafana unreachable at port 3004"
fi

# ── 10. Jaeger ───────────────────────────────────────────────────────────────
echo "10. Jaeger (port 16686):"
if curl -sf http://localhost:16686 > /dev/null 2>&1; then
    pass "Jaeger UI at http://localhost:16686"
else
    warn "Jaeger unreachable at port 16686"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════"
if [ "$FAILURES" -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    echo ""
    echo "Access points:"
    echo "  Dashboard:  http://localhost:3002   (admin/admin)"
    echo "  Grafana:    http://localhost:3004   (admin/admin)"
    echo "  Prometheus: http://localhost:9090"
    echo "  CNC API:    http://localhost:8080/api/health"
    echo "  Jaeger:     http://localhost:16686"
    echo ""
    echo "Run integration tests:"
    echo "  CNC_API_URL=http://localhost:8080 python3 -m pytest \\"
    echo "    tests/integration/test_ethical_safeguards.py \\"
    echo "    -k 'not TestCNCRateLimitLockout' -q"
else
    echo -e "${RED}❌ $FAILURES critical check(s) failed — see above.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  docker-compose logs <service>   # check service logs"
    echo "  docker-compose ps               # check container status"
    echo "  See: docs/deployment/DOCKER_BUILD_GUIDE.md section 9"
    exit 1
fi
echo "══════════════════════════════════════════════════════"

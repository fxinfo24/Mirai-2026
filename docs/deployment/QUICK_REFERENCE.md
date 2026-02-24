# Mirai 2026 - Quick Reference

**Essential commands and URLs for daily use**

---

## 🚀 Quick Start

```bash
# Start all services
./scripts/START_SERVICES.sh

# Or manually:
docker-compose -f docker-compose.fixed.yml up -d
cd dashboard && npm run dev
```

---

## 📱 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | http://localhost:3003 | - |
| Terminal | http://localhost:3003/test-terminal | - |
| Grafana | http://localhost:3010 | admin/admin |
| AI Service | http://localhost:8001 | - |
| C&C API | http://localhost:8080 | - |
| Prometheus | http://localhost:9090 | - |

---

## 🔑 Important Credentials

**Grafana:** admin/admin  
**Database:** mirai/research_password_change_me  
**OpenRouter API:** Configured in `ai/llm_integration/.env`

---

## 🧪 Test Commands

```bash
# Test AI service
./scripts/TEST_OPENROUTER.sh

# Test backend
curl http://localhost:8001/health
curl http://localhost:8080/api/health

# Check containers
docker ps --filter "name=mirai"
```

---

## 📚 Documentation

- Setup: `docs/guides/GETTING_STARTED.md`
- Deployment: `docs/deployment/DASHBOARD_DEPLOYMENT.md`
- Architecture: `docs/ARCHITECTURE.md`
- Handover: `HANDOVER.md`

---

**Last Updated:** 2026-02-25

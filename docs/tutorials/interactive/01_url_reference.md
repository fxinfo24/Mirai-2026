### Complete Service URL Reference

| Service | URL | Credentials | Purpose |
|---------|-----|-------------|---------|
| **Dashboard** | http://localhost:3003 | - | Main web interface |
| **Terminal** | http://localhost:3003/test-terminal | - | Interactive CLI |
| **AI Service** | http://localhost:8001 | - | ML predictions & LLM |
| **C&C API** | http://localhost:8080 | - | Bot management API |
| **Grafana** | http://localhost:3010 | admin/admin | Metrics dashboards |
| **Prometheus** | http://localhost:9090 | - | Metrics collection |
| **Jaeger** | http://localhost:16686 | - | Distributed tracing |
| **PostgreSQL** | localhost:5433 | mirai/password | Database |
| **Redis** | localhost:6380 | - | Cache |

### Quick Test Commands

```bash
# Test all services
curl http://localhost:8001/health         # AI Service
curl http://localhost:8080/api/health     # C&C API  
curl http://localhost:9090/-/healthy      # Prometheus
curl http://localhost:3010/api/health     # Grafana

# Open dashboard
open http://localhost:3003

# Open terminal
open http://localhost:3003/test-terminal

# Open Grafana (login: admin/admin)
open http://localhost:3010
```

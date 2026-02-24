# Docker Deployment Guide

Quick reference for running Mirai 2026 with Docker.

## Quick Start

```bash
# Development
docker-compose up -d

# Sandbox (safe testing)
docker-compose -f docker-compose.sandbox.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Related Documentation

- [Kubernetes Deployment](KUBERNETES.md) - Production orchestration
- [Getting Started](../guides/GETTING_STARTED.md) - Initial setup
- [Architecture](../ARCHITECTURE.md) - System design

## Docker Images

Built images:
- `mirai-bot:latest` - Main bot component
- `mirai-ai-service:latest` - AI/ML service
- `mirai-loader:latest` - Device loader

See [docker/](../../docker/) for Dockerfiles.

## Configuration

Environment variables in `.env`:
```bash
# Copy example
cp ai/llm_integration/.env.example .env

# Edit configuration
nano .env
```

See [LLM Integration Guide](../api/LLM_INTEGRATION.md) for API setup.

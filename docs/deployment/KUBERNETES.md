# Deployment Guide - Mirai 2026

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Kubernetes cluster (or minikube for local testing)
- kubectl configured
- Terraform (for cloud deployment)

### Local Development with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Kubernetes Deployment

#### Development Environment
```bash
# Apply development configuration
kubectl apply -k k8s/overlays/dev/

# Check deployment status
kubectl get pods -n mirai-2026-dev

# View logs
kubectl logs -f deployment/dev-mirai-bot -n mirai-2026-dev
```

#### Production Environment
```bash
# Apply production configuration
kubectl apply -k k8s/overlays/prod/

# Monitor rollout
kubectl rollout status deployment/prod-mirai-bot -n mirai-2026-prod
```

### Cloud Deployment with Terraform

```bash
cd terraform/

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file=environments/prod.tfvars

# Apply infrastructure
terraform apply -var-file=environments/prod.tfvars

# Get outputs
terraform output
```

## Configuration

See `config/bot.example.json` for configuration options.

## Monitoring

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- AI API: http://localhost:5000/health

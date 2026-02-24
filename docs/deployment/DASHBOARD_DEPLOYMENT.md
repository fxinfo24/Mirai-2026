# Mirai 2026 Dashboard - Deployment Guide

**Last Updated:** February 24, 2026  
**Version:** 1.0.0  
**Status:** Production-Ready

---

## 📋 Overview

This guide covers deploying the Mirai 2026 Dashboard in various environments:
- Local production build
- Docker deployment
- Kubernetes (K8s)
- Cloud platforms (Vercel, AWS, GCP)
- Monitoring and observability

---

## 🎯 Prerequisites

### Required Tools
- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Docker:** 20.10+ (for containerized deployment)
- **kubectl:** 1.25+ (for Kubernetes deployment)

### Environment Requirements
- **Memory:** Minimum 2GB RAM
- **Storage:** 500MB for build artifacts
- **Network:** Outbound access for npm packages

---

## 🚀 Production Build

### Step 1: Install Dependencies

```bash
cd dashboard
npm install --production=false
```

### Step 2: Build for Production

```bash
# Create optimized production build
npm run build

# Build output:
# - .next/ directory (optimized assets)
# - Static pages pre-rendered
# - API routes bundled
# - Images optimized
```

### Step 3: Verify Build

```bash
# Check build size
du -sh .next/

# Expected output: ~120-150MB
# - .next/static/: Static assets
# - .next/server/: Server components
# - .next/cache/: Build cache
```

### Step 4: Start Production Server

```bash
# Start production server
npm run start

# Server starts on http://localhost:3000
# Or set PORT environment variable:
PORT=3002 npm run start
```

### Build Statistics

**Typical build metrics:**
- Build time: 2-4 minutes
- Bundle size: ~500KB (gzipped)
- Static pages: 7
- API routes: 0 (static export compatible)

---

## 🐳 Docker Deployment

### Option 1: Standalone Dashboard

**Dockerfile:**

```dockerfile
# Use official Node.js image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start application
CMD ["npm", "run", "start"]
```

**Build and Run:**

```bash
# Build Docker image
docker build -t mirai-dashboard:latest -f dashboard/Dockerfile dashboard/

# Run container
docker run -d \
  -p 3002:3000 \
  --name mirai-dashboard \
  mirai-dashboard:latest

# Check logs
docker logs -f mirai-dashboard

# Access at http://localhost:3002
```

### Option 2: Docker Compose (Full Stack)

**docker-compose.dashboard.yml:**

```yaml
version: '3.8'

services:
  dashboard:
    build:
      context: ./dashboard
      dockerfile: Dockerfile
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://ai-service:8000
      - NEXT_PUBLIC_WS_URL=http://websocket:8888
    depends_on:
      - websocket
    restart: unless-stopped
    networks:
      - mirai-network

  websocket:
    build:
      context: ./dashboard
      dockerfile: Dockerfile.websocket
    ports:
      - "8888:8888"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - mirai-network

networks:
  mirai-network:
    external: true
```

**Dockerfile.websocket:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install socket.io

COPY mock-websocket-server.js .

EXPOSE 8888

CMD ["node", "mock-websocket-server.js"]
```

**Deploy:**

```bash
# Start full stack
docker-compose -f docker-compose.dashboard.yml up -d

# Check status
docker-compose -f docker-compose.dashboard.yml ps

# View logs
docker-compose -f docker-compose.dashboard.yml logs -f dashboard

# Stop
docker-compose -f docker-compose.dashboard.yml down
```

---

## ☸️ Kubernetes Deployment

### Dashboard Deployment

**k8s/dashboard/deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mirai-dashboard
  namespace: mirai-2026
  labels:
    app: mirai-dashboard
    tier: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mirai-dashboard
  template:
    metadata:
      labels:
        app: mirai-dashboard
    spec:
      containers:
      - name: dashboard
        image: mirai-dashboard:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_API_URL
          value: "http://ai-service:8000"
        - name: NEXT_PUBLIC_WS_URL
          value: "http://websocket-service:8888"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: dashboard-service
  namespace: mirai-2026
spec:
  selector:
    app: mirai-dashboard
  ports:
  - port: 80
    targetPort: 3000
    name: http
  type: LoadBalancer
```

### WebSocket Service

**k8s/dashboard/websocket-deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-server
  namespace: mirai-2026
spec:
  replicas: 1
  selector:
    matchLabels:
      app: websocket-server
  template:
    metadata:
      labels:
        app: websocket-server
    spec:
      containers:
      - name: websocket
        image: mirai-websocket:latest
        ports:
        - containerPort: 8888
          name: websocket
        env:
        - name: PORT
          value: "8888"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: websocket-service
  namespace: mirai-2026
spec:
  selector:
    app: websocket-server
  ports:
  - port: 8888
    targetPort: 8888
    name: websocket
  type: ClusterIP
```

### Ingress (Optional)

**k8s/dashboard/ingress.yaml:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: mirai-2026
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - dashboard.mirai2026.example.com
    secretName: dashboard-tls
  rules:
  - host: dashboard.mirai2026.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dashboard-service
            port:
              number: 80
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace mirai-2026

# Apply deployments
kubectl apply -f k8s/dashboard/deployment.yaml
kubectl apply -f k8s/dashboard/websocket-deployment.yaml
kubectl apply -f k8s/dashboard/ingress.yaml

# Check status
kubectl get pods -n mirai-2026
kubectl get services -n mirai-2026
kubectl get ingress -n mirai-2026

# View logs
kubectl logs -f deployment/mirai-dashboard -n mirai-2026

# Scale deployment
kubectl scale deployment mirai-dashboard --replicas=5 -n mirai-2026
```

---

## ☁️ Cloud Platform Deployment

### Vercel (Recommended for Next.js)

**Setup:**

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login:**
```bash
vercel login
```

3. **Deploy:**
```bash
cd dashboard
vercel

# Follow prompts:
# - Set up and deploy
# - Project name: mirai-dashboard
# - Directory: ./
# - Build command: npm run build
# - Output directory: .next
```

4. **Production deployment:**
```bash
vercel --prod
```

**Environment Variables:**

```bash
# Set via Vercel dashboard or CLI
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_WS_URL production
```

**vercel.json:**

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["sfo1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_WS_URL": "@ws_url"
  }
}
```

### AWS Amplify

**amplify.yml:**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd dashboard
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dashboard/.next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Google Cloud Run

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/mirai-dashboard dashboard/

# Deploy to Cloud Run
gcloud run deploy mirai-dashboard \
  --image gcr.io/PROJECT_ID/mirai-dashboard \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1
```

---

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.mirai2026.example.com
NEXT_PUBLIC_WS_URL=wss://ws.mirai2026.example.com

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_3D_GLOBE=true

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Build Configuration
NODE_ENV=production
ANALYZE=false
```

### Security Headers

**next.config.js:**

```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## 📊 Monitoring & Observability

### Application Monitoring

**Sentry Integration:**

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs
```

**sentry.client.config.js:**

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### Metrics Collection

**Prometheus Integration:**

```javascript
// pages/api/metrics.ts
import promClient from 'prom-client';

const register = new promClient.Registry();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

export default async function handler(req, res) {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
}
```

### Health Checks

**pages/api/health.ts:**

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  res.status(200).json(health);
}
```

---

## 🔒 Security Best Practices

### 1. Environment Variables

```bash
# Never commit .env files
# Use .env.example for templates
# Rotate secrets regularly
# Use secret management (AWS Secrets Manager, Vault)
```

### 2. Dependencies

```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Update packages
npm update

# Check for outdated packages
npm outdated
```

### 3. Rate Limiting

**middleware.ts:**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map();

export function middleware(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;

  const userRequests = rateLimit.get(ip) || [];
  const recentRequests = userRequests.filter((time: number) => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);

  return NextResponse.next();
}
```

---

## 🚦 Performance Optimization

### 1. Image Optimization

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
};
```

### 2. Code Splitting

```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const Globe3D = dynamic(() => import('@/components/globe/Globe3D'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
```

### 3. Caching Strategy

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

---

## 📝 Deployment Checklist

### Pre-Deployment

- [ ] Run all tests (`npm test`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors
- [ ] Environment variables configured
- [ ] Security headers set
- [ ] Dependencies audited

### Deployment

- [ ] Build artifacts created
- [ ] Docker image built (if applicable)
- [ ] Database migrations run (if applicable)
- [ ] Health check endpoints working
- [ ] SSL/TLS certificates configured
- [ ] DNS records updated

### Post-Deployment

- [ ] Smoke tests passed
- [ ] Monitoring active
- [ ] Logs accessible
- [ ] Performance metrics acceptable
- [ ] Rollback plan ready
- [ ] Team notified

---

## 🔄 CI/CD Pipeline

### GitHub Actions

**.github/workflows/deploy.yml:**

```yaml
name: Deploy Dashboard

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: dashboard/package-lock.json
      
      - name: Install dependencies
        working-directory: ./dashboard
        run: npm ci
      
      - name: Type check
        working-directory: ./dashboard
        run: npm run type-check
      
      - name: Run tests
        working-directory: ./dashboard
        run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: ./dashboard
        run: npm ci
      
      - name: Build
        working-directory: ./dashboard
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dashboard/.next

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Add deployment commands here
          echo "Deploying to production..."
```

---

## 🆘 Troubleshooting

### Common Issues

**Build Failures:**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

**Memory Issues:**
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

**Port Already in Use:**
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run start
```

**WebSocket Connection Issues:**
```bash
# Check WebSocket server
curl http://localhost:8888

# Check CORS settings
# Ensure dashboard URL is in allowed origins
```

---

## 📚 Additional Resources

### Documentation
- Next.js Deployment: https://nextjs.org/docs/deployment
- Vercel Platform: https://vercel.com/docs
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/
- Kubernetes Guides: https://kubernetes.io/docs/home/

### Monitoring
- Sentry: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/

---

## 🎯 Quick Reference

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run tests
npm run type-check   # TypeScript validation
```

### Docker
```bash
docker build -t mirai-dashboard .
docker run -p 3002:3000 mirai-dashboard
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f k8s/dashboard/
kubectl get pods -n mirai-2026
kubectl logs -f deployment/mirai-dashboard -n mirai-2026
```

---

**Deployment Guide Version:** 1.0.0  
**Last Updated:** February 24, 2026  
**Maintained By:** Mirai 2026 Team

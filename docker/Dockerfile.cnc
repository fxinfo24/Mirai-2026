# Minimal CNC placeholder (to be implemented in Go)
FROM alpine:3.19

# Install minimal runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    postgresql-client \
    redis

# Create non-root user
RUN addgroup -S mirai && \
    adduser -S -G mirai mirai

WORKDIR /app

# Create placeholder script
RUN echo '#!/bin/sh' > /app/cnc-placeholder.sh && \
    echo 'echo "Mirai 2026 CNC Server - Placeholder"' >> /app/cnc-placeholder.sh && \
    echo 'echo "Real implementation coming soon (Go-based)"' >> /app/cnc-placeholder.sh && \
    echo 'echo "This container keeps the network stack ready"' >> /app/cnc-placeholder.sh && \
    echo 'echo "Press Ctrl+C to stop"' >> /app/cnc-placeholder.sh && \
    echo 'tail -f /dev/null' >> /app/cnc-placeholder.sh && \
    chmod +x /app/cnc-placeholder.sh

RUN chown -R mirai:mirai /app

USER mirai

LABEL org.opencontainers.image.title="Mirai 2026 CNC (Placeholder)"
LABEL org.opencontainers.image.description="CNC Server Placeholder - To be implemented"
LABEL org.opencontainers.image.version="2.0.0"

ENTRYPOINT ["/app/cnc-placeholder.sh"]

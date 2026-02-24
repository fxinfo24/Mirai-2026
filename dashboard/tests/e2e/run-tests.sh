#!/bin/bash

# Run E2E Tests for Mirai 2026 Dashboard
# This script ensures the dev server is running before executing tests

set -e

echo "🧪 Starting E2E Test Suite..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dev server is running
echo "📡 Checking if dev server is running on port 3002..."
if ! curl -s http://localhost:3002 > /dev/null; then
    echo -e "${RED}❌ Dev server not running!${NC}"
    echo -e "${YELLOW}Please start the dev server first:${NC}"
    echo "  cd dashboard && npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Dev server is running${NC}"

# Create screenshots directory
mkdir -p tests/e2e/screenshots

# Run tests
echo "🚀 Running E2E tests..."
npm run test:e2e

echo -e "${GREEN}✅ Tests completed!${NC}"
echo "📸 Screenshots saved to: tests/e2e/screenshots/"

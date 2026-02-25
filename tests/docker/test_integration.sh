#!/bin/bash
# Mirai 2026 - Docker Integration Testing Script
# Tests all components in the Docker environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Mirai 2026 Docker Integration Tests${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Function to print test results
print_result() {
    local test_name=$1
    local result=$2
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Test 1: Check if Docker is running
echo -e "${YELLOW}Test 1: Checking if Docker is running...${NC}"
if docker info &> /dev/null; then
    print_result "Docker daemon is running" "PASS"
else
    print_result "Docker daemon is not running" "FAIL"
    echo -e "${RED}ERROR: Please start Docker and try again${NC}"
    exit 1
fi

# Test 2: Check if docker-compose is available
echo -e "${YELLOW}Test 2: Checking for docker-compose...${NC}"
if command -v docker-compose &> /dev/null; then
    print_result "docker-compose is installed" "PASS"
else
    print_result "docker-compose is not installed" "FAIL"
fi

# Test 3: Check if services are running
echo -e "${YELLOW}Test 3: Checking running containers...${NC}"
RUNNING_CONTAINERS=$(docker ps --format '{{.Names}}' | grep -c "mirai" || echo "0")
if [ "$RUNNING_CONTAINERS" -ge 5 ]; then
    print_result "Mirai containers are running ($RUNNING_CONTAINERS containers)" "PASS"
else
    print_result "Not all Mirai containers are running (found $RUNNING_CONTAINERS)" "FAIL"
    echo -e "${YELLOW}  Starting containers with docker-compose up -d...${NC}"
    docker-compose up -d
    sleep 10
fi

# Test 4: Test PostgreSQL connectivity
echo -e "${YELLOW}Test 4: Testing PostgreSQL connectivity...${NC}"
if docker exec mirai-postgres pg_isready -U mirai &> /dev/null; then
    print_result "PostgreSQL is ready" "PASS"
else
    print_result "PostgreSQL is not ready" "FAIL"
fi

# Test 5: Test Redis connectivity
echo -e "${YELLOW}Test 5: Testing Redis connectivity...${NC}"
REDIS_PING=$(docker exec mirai-redis redis-cli ping 2>/dev/null || echo "FAIL")
if [ "$REDIS_PING" = "PONG" ]; then
    print_result "Redis is responding" "PASS"
else
    print_result "Redis is not responding" "FAIL"
fi

# Test 6: Test AI Service health
echo -e "${YELLOW}Test 6: Testing AI Service health...${NC}"
AI_HEALTH=$(curl -s http://localhost:8001/health 2>/dev/null || echo "FAIL")
if echo "$AI_HEALTH" | grep -q "healthy\|ok"; then
    print_result "AI Service is healthy" "PASS"
else
    print_result "AI Service is not responding" "FAIL"
    echo -e "${YELLOW}  Response: $AI_HEALTH${NC}"
fi

# Test 7: Test Prometheus
echo -e "${YELLOW}Test 7: Testing Prometheus...${NC}"
PROM_STATUS=$(curl -s http://localhost:9090/-/healthy 2>/dev/null || echo "FAIL")
if echo "$PROM_STATUS" | grep -q "Prometheus"; then
    print_result "Prometheus is healthy" "PASS"
else
    print_result "Prometheus is not responding" "FAIL"
fi

# Test 8: Test Grafana
echo -e "${YELLOW}Test 8: Testing Grafana...${NC}"
GRAFANA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/api/health 2>/dev/null || echo "000")
if [ "$GRAFANA_STATUS" = "200" ]; then
    print_result "Grafana is accessible" "PASS"
else
    print_result "Grafana is not accessible (HTTP $GRAFANA_STATUS)" "FAIL"
fi

# Test 9: Test Jaeger
echo -e "${YELLOW}Test 9: Testing Jaeger...${NC}"
JAEGER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:16686/ 2>/dev/null || echo "000")
if [ "$JAEGER_STATUS" = "200" ]; then
    print_result "Jaeger UI is accessible" "PASS"
else
    print_result "Jaeger UI is not accessible (HTTP $JAEGER_STATUS)" "FAIL"
fi

# Test 10: Check container health status
echo -e "${YELLOW}Test 10: Checking container health status...${NC}"
HEALTHY_COUNT=$(docker ps --format '{{.Names}}\t{{.Status}}' | grep "mirai" | grep -c "(healthy)" || echo "0")
TOTAL_MIRAI=$(docker ps --format '{{.Names}}' | grep -c "mirai" || echo "0")

if [ "$HEALTHY_COUNT" -ge 3 ]; then
    print_result "Containers reporting healthy ($HEALTHY_COUNT/$TOTAL_MIRAI)" "PASS"
else
    print_result "Some containers not healthy ($HEALTHY_COUNT/$TOTAL_MIRAI)" "FAIL"
    docker ps --format 'table {{.Names}}\t{{.Status}}' | grep "mirai"
fi

# Test 11: Check Docker network
echo -e "${YELLOW}Test 11: Checking Docker network...${NC}"
if docker network inspect mirai-2026_default &> /dev/null; then
    print_result "Docker network exists" "PASS"
else
    print_result "Docker network not found" "FAIL"
fi

# Test 12: Check volumes
echo -e "${YELLOW}Test 12: Checking Docker volumes...${NC}"
VOLUME_COUNT=$(docker volume ls | grep -c "mirai" || echo "0")
if [ "$VOLUME_COUNT" -ge 1 ]; then
    print_result "Docker volumes exist ($VOLUME_COUNT volumes)" "PASS"
else
    print_result "Docker volumes not found" "FAIL"
fi

# Test 13: Test database connection from AI service
echo -e "${YELLOW}Test 13: Testing database connection from AI service...${NC}"
DB_TEST=$(docker exec mirai-ai-service python -c "
import psycopg2
try:
    conn = psycopg2.connect(
        host='postgres',
        database='mirai',
        user='mirai',
        password='research_default_dev_only'
    )
    conn.close()
    print('SUCCESS')
except Exception as e:
    print('FAIL:', e)
" 2>&1 || echo "FAIL")

if echo "$DB_TEST" | grep -q "SUCCESS"; then
    print_result "AI service can connect to database" "PASS"
else
    print_result "AI service cannot connect to database" "FAIL"
    echo -e "${YELLOW}  Error: $DB_TEST${NC}"
fi

# Test 14: Check logs for errors
echo -e "${YELLOW}Test 14: Checking container logs for errors...${NC}"
ERROR_COUNT=$(docker-compose logs --tail=100 2>&1 | grep -i "error\|exception\|fatal" | grep -v "error_exitcode\|No error" | wc -l || echo "0")
if [ "$ERROR_COUNT" -lt 5 ]; then
    print_result "Minimal errors in logs ($ERROR_COUNT errors)" "PASS"
else
    print_result "Multiple errors in logs ($ERROR_COUNT errors)" "FAIL"
    echo -e "${YELLOW}  Recent errors:${NC}"
    docker-compose logs --tail=100 2>&1 | grep -i "error\|exception" | head -5
fi

# Test 15: Test PDF/Excel export libraries
echo -e "${YELLOW}Test 15: Testing PDF/Excel export libraries in dashboard...${NC}"
if [ -d "dashboard/node_modules/jspdf" ] && [ -d "dashboard/node_modules/xlsx" ]; then
    print_result "jsPDF and xlsx libraries installed" "PASS"
else
    print_result "PDF/Excel libraries not installed" "FAIL"
fi

echo ""
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Container Status${NC}"
echo -e "${BLUE}=======================================${NC}"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep "mirai\|NAME"

echo ""
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "Total tests run:    ${TESTS_RUN}"
echo -e "${GREEN}Tests passed:       ${TESTS_PASSED}${NC}"
echo -e "${RED}Tests failed:       ${TESTS_FAILED}${NC}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All integration tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. Review the output above.${NC}"
    echo -e "${YELLOW}This may be expected if some services are still starting up.${NC}"
    exit 1
fi

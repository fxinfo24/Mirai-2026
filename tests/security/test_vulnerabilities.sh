#!/bin/bash
# Mirai 2026 - Security Vulnerability Testing Script
# Tests all fixed security vulnerabilities to ensure patches are effective

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build/debug"

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
echo -e "${BLUE}Mirai 2026 Security Vulnerability Tests${NC}"
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

# Test 1: Check for unsafe strcpy usage
echo -e "${YELLOW}Test 1: Checking for unsafe strcpy() usage...${NC}"
STRCPY_COUNT=$(grep -r "strcpy(" loader/src/*.c 2>/dev/null | grep -v "strncpy" | wc -l || echo "0")
if [ "$STRCPY_COUNT" -eq 0 ]; then
    print_result "No unsafe strcpy() found in loader/src/" "PASS"
else
    print_result "Found $STRCPY_COUNT unsafe strcpy() in loader/src/" "FAIL"
    grep -n "strcpy(" loader/src/*.c | grep -v "strncpy" || true
fi

# Test 2: Check for unsafe sprintf usage
echo -e "${YELLOW}Test 2: Checking for unsafe sprintf() usage...${NC}"
SPRINTF_COUNT=$(grep -r "sprintf(" loader/src/*.c 2>/dev/null | grep -v "snprintf" | wc -l || echo "0")
if [ "$SPRINTF_COUNT" -eq 0 ]; then
    print_result "No unsafe sprintf() found in loader/src/" "PASS"
else
    print_result "Found $SPRINTF_COUNT unsafe sprintf() in loader/src/" "FAIL"
    grep -n "sprintf(" loader/src/*.c | grep -v "snprintf" || true
fi

# Test 3: Check for hardcoded passwords in docker-compose.yml
echo -e "${YELLOW}Test 3: Checking for hardcoded passwords in docker-compose.yml...${NC}"
if grep -q "research_password_change_me" docker-compose.yml; then
    print_result "Hardcoded password still present in docker-compose.yml" "FAIL"
else
    print_result "No hardcoded password in docker-compose.yml" "PASS"
fi

# Test 4: Check for environment variable usage
echo -e "${YELLOW}Test 4: Checking for proper environment variable usage...${NC}"
if grep -q '${POSTGRES_PASSWORD' docker-compose.yml; then
    print_result "Environment variable pattern found in docker-compose.yml" "PASS"
else
    print_result "Missing environment variable in docker-compose.yml" "FAIL"
fi

# Test 5: Check for .env.example file
echo -e "${YELLOW}Test 5: Checking for .env.example file...${NC}"
if [ -f ".env.example" ]; then
    if grep -q "POSTGRES_PASSWORD" .env.example; then
        print_result ".env.example exists with POSTGRES_PASSWORD" "PASS"
    else
        print_result ".env.example missing POSTGRES_PASSWORD" "FAIL"
    fi
else
    print_result ".env.example file not found" "FAIL"
fi

# Test 6: Check for IP validation in loader_manager.py
echo -e "${YELLOW}Test 6: Checking for IP validation in loader_manager.py...${NC}"
if grep -q "ipaddress.ip_address" ai/loader_manager.py; then
    if grep -q "_validate_ip_address" ai/loader_manager.py; then
        print_result "IP validation function found in loader_manager.py" "PASS"
    else
        print_result "IP validation code incomplete in loader_manager.py" "FAIL"
    fi
else
    print_result "No IP validation in loader_manager.py" "FAIL"
fi

# Test 7: Check for memory leak fixes in binary.c
echo -e "${YELLOW}Test 7: Checking for memory leak fixes in binary.c...${NC}"
if grep -q "SECURITY FIX" loader/src/binary.c; then
    FREE_COUNT=$(grep -c "free(" loader/src/binary.c || echo "0")
    if [ "$FREE_COUNT" -ge 5 ]; then
        print_result "Memory cleanup code found in binary.c (found $FREE_COUNT free() calls)" "PASS"
    else
        print_result "Insufficient memory cleanup in binary.c (only $FREE_COUNT free() calls)" "FAIL"
    fi
else
    print_result "Memory leak fix not found in binary.c" "FAIL"
fi

# Test 8: Check for buffer size validation
echo -e "${YELLOW}Test 8: Checking for buffer size validation in strncpy calls...${NC}"
STRNCPY_COUNT=$(grep -c "strncpy.*sizeof.*-.*1" loader/src/telnet_info.c 2>/dev/null || echo "0")
if [ "$STRNCPY_COUNT" -ge 3 ]; then
    print_result "Proper strncpy with size validation found ($STRNCPY_COUNT instances)" "PASS"
else
    print_result "Insufficient strncpy size validation ($STRNCPY_COUNT instances)" "FAIL"
fi

# Test 9: Check for null termination after strncpy
echo -e "${YELLOW}Test 9: Checking for null termination after strncpy...${NC}"
NULL_TERM_COUNT=$(grep -A1 "strncpy" loader/src/telnet_info.c | grep -c '\\0' || echo "0")
if [ "$NULL_TERM_COUNT" -ge 3 ]; then
    print_result "Null termination found after strncpy ($NULL_TERM_COUNT instances)" "PASS"
else
    print_result "Missing null termination after strncpy" "FAIL"
fi

# Test 10: Static analysis with cppcheck (if available)
echo -e "${YELLOW}Test 10: Running static analysis (cppcheck)...${NC}"
if command -v cppcheck &> /dev/null; then
    CPPCHECK_OUTPUT=$(cppcheck --quiet --error-exitcode=1 loader/src/ 2>&1 || echo "errors_found")
    if echo "$CPPCHECK_OUTPUT" | grep -q "errors_found"; then
        print_result "Static analysis found issues" "FAIL"
        echo "$CPPCHECK_OUTPUT"
    else
        print_result "Static analysis passed" "PASS"
    fi
else
    echo -e "${YELLOW}  ⚠ cppcheck not installed, skipping static analysis${NC}"
fi

# Test 11: Check Python import security
echo -e "${YELLOW}Test 11: Checking Python security imports...${NC}"
IPADDRESS_IMPORT=$(grep -c "import ipaddress" ai/loader_manager.py || echo "0")
if [ "$IPADDRESS_IMPORT" -ge 1 ]; then
    print_result "Python ipaddress module imported" "PASS"
else
    print_result "Missing ipaddress import in Python code" "FAIL"
fi

# Test 12: Verify no eval/exec in Python code
echo -e "${YELLOW}Test 12: Checking for dangerous Python functions (eval/exec)...${NC}"
EVAL_COUNT=$(grep -r "\beval\(" ai/*.py 2>/dev/null | grep -v "literal_eval" | grep -v "#" | wc -l || echo "0")
EXEC_COUNT=$(grep -r "\bexec\(" ai/*.py 2>/dev/null | grep -v "execute" | grep -v "#" | wc -l || echo "0")

if [ "$EVAL_COUNT" -eq 0 ] && [ "$EXEC_COUNT" -eq 0 ]; then
    print_result "No dangerous eval/exec found in Python code" "PASS"
else
    print_result "Found eval ($EVAL_COUNT) or exec ($EXEC_COUNT) in Python code" "FAIL"
fi

echo ""
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "Total tests run:    ${TESTS_RUN}"
echo -e "${GREEN}Tests passed:       ${TESTS_PASSED}${NC}"
echo -e "${RED}Tests failed:       ${TESTS_FAILED}${NC}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✓ All security tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some security tests failed. Please review the output above.${NC}"
    exit 1
fi

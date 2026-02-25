#!/bin/bash
# Comprehensive Performance Testing Framework - Mirai 2026
#
# Purpose: Run all performance benchmarks and generate report
#
# Usage:
#   ./run_all_benchmarks.sh [--quick]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results_$(date +%Y%m%d_%H%M%S)"

mkdir -p "$RESULTS_DIR"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "Mirai 2026 Performance Benchmark Suite"
echo "========================================"
echo
echo "Results directory: $RESULTS_DIR"
echo

# Check if quick mode
QUICK_MODE=0
if [ "$1" == "--quick" ]; then
    QUICK_MODE=1
    echo "Quick mode: Reduced test duration"
    echo
fi

# Function to run benchmark
run_benchmark() {
    local name="$1"
    local cmd="$2"
    local output_file="$RESULTS_DIR/${name}.log"
    
    echo -e "${BLUE}[Running]${NC} $name"
    echo "Command: $cmd" > "$output_file"
    echo >> "$output_file"
    
    if eval "$cmd" >> "$output_file" 2>&1; then
        echo -e "${GREEN}[✓ PASS]${NC} $name"
        return 0
    else
        echo -e "${RED}[✗ FAIL]${NC} $name"
        return 1
    fi
}

# Build benchmarks
echo "========================================"
echo "Building Benchmarks"
echo "========================================"
echo

cd "$PROJECT_ROOT"
mkdir -p build/benchmark
cd build/benchmark

cmake -DCMAKE_BUILD_TYPE=Release "$PROJECT_ROOT" > /dev/null 2>&1
make scanner_benchmark loader_benchmark cnc_benchmark -j$(nproc) 2>&1 | grep -v "^Scanning" || true

if [ -f "tests/benchmark/scanner_benchmark" ]; then
    echo -e "${GREEN}✓${NC} Scanner benchmark built"
else
    echo -e "${RED}✗${NC} Scanner benchmark build failed"
fi

if [ -f "tests/benchmark/loader_benchmark" ]; then
    echo -e "${GREEN}✓${NC} Loader benchmark built"
else
    echo -e "${RED}✗${NC} Loader benchmark build failed"
fi

if [ -f "tests/benchmark/cnc_benchmark" ]; then
    echo -e "${GREEN}✓${NC} CNC benchmark built"
else
    echo -e "${RED}✗${NC} CNC benchmark build failed"
fi

echo

# Benchmark 1: Scanner Performance
echo "========================================"
echo "1/4 Scanner Performance Benchmark"
echo "========================================"
echo

if [ $QUICK_MODE -eq 1 ]; then
    SCANNER_DURATION=10
else
    SCANNER_DURATION=60
fi

if [ -f "tests/benchmark/scanner_benchmark" ]; then
    run_benchmark "scanner" \
        "sudo tests/benchmark/scanner_benchmark --target 192.168.100.0/24 --threads 1 --duration $SCANNER_DURATION || \
         tests/benchmark/scanner_benchmark --target 192.168.100.0/24 --threads 1 --duration $SCANNER_DURATION"
else
    echo -e "${YELLOW}[SKIP]${NC} Scanner benchmark not built"
fi

echo

# Benchmark 2: Loader Performance
echo "========================================"
echo "2/4 Loader Performance Benchmark"
echo "========================================"
echo

if [ $QUICK_MODE -eq 1 ]; then
    LOADER_CONNECTIONS=1000
    LOADER_DURATION=30
else
    LOADER_CONNECTIONS=60000
    LOADER_DURATION=300
fi

if [ -f "tests/benchmark/loader_benchmark" ]; then
    run_benchmark "loader" \
        "tests/benchmark/loader_benchmark --ips 5 --target-connections $LOADER_CONNECTIONS --duration $LOADER_DURATION"
else
    echo -e "${YELLOW}[SKIP]${NC} Loader benchmark not built"
fi

echo

# Benchmark 3: CNC Scalability
echo "========================================"
echo "3/4 CNC Scalability Benchmark"
echo "========================================"
echo

if [ $QUICK_MODE -eq 1 ]; then
    CNC_BOTS=1000
    CNC_RAMP=10
    CNC_DURATION=30
else
    CNC_BOTS=100000
    CNC_RAMP=60
    CNC_DURATION=300
fi

# Check if CNC server is running
if nc -z 127.0.0.1 23 2>/dev/null; then
    echo "CNC server detected on port 23"
    if [ -f "tests/benchmark/cnc_benchmark" ]; then
        run_benchmark "cnc" \
            "tests/benchmark/cnc_benchmark --target-bots $CNC_BOTS --ramp-up $CNC_RAMP --duration $CNC_DURATION --host 127.0.0.1 --port 23"
    else
        echo -e "${YELLOW}[SKIP]${NC} CNC benchmark not built"
    fi
else
    echo -e "${YELLOW}[SKIP]${NC} CNC server not running on port 23"
    echo "  Start CNC server first: docker-compose up cnc"
fi

echo

# Benchmark 4: Binary Size
echo "========================================"
echo "4/4 Binary Size Check"
echo "========================================"
echo

if [ -f "$SCRIPT_DIR/binary_size_check.sh" ]; then
    run_benchmark "binary_size" \
        "$SCRIPT_DIR/binary_size_check.sh"
else
    echo -e "${YELLOW}[SKIP]${NC} Binary size check script not found"
fi

echo

# Generate summary report
echo "========================================"
echo "Generating Summary Report"
echo "========================================"
echo

REPORT_FILE="$RESULTS_DIR/BENCHMARK_REPORT.md"

cat > "$REPORT_FILE" << 'EOF'
# Mirai 2026 Performance Benchmark Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Mode:** $([ $QUICK_MODE -eq 1 ] && echo "Quick" || echo "Full")

---

## Executive Summary

EOF

# Function to extract metric from log
extract_metric() {
    local log_file="$1"
    local pattern="$2"
    
    if [ -f "$log_file" ]; then
        grep "$pattern" "$log_file" | head -n1 || echo "N/A"
    else
        echo "N/A"
    fi
}

# Scanner results
echo "### Scanner Performance" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"
if [ -f "$RESULTS_DIR/scanner.log" ]; then
    echo '```' >> "$REPORT_FILE"
    extract_metric "$RESULTS_DIR/scanner.log" "SYNs/sec per thread" >> "$REPORT_FILE"
    extract_metric "$RESULTS_DIR/scanner.log" "CPU usage" >> "$REPORT_FILE"
    extract_metric "$RESULTS_DIR/scanner.log" "Speedup vs qbot" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
else
    echo "No results available" >> "$REPORT_FILE"
fi
echo >> "$REPORT_FILE"

# Loader results
echo "### Loader Performance" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"
if [ -f "$RESULTS_DIR/loader.log" ]; then
    echo '```' >> "$REPORT_FILE"
    extract_metric "$RESULTS_DIR/loader.log" "Concurrent connections" >> "$REPORT_FILE"
    extract_metric "$RESULTS_DIR/loader.log" "Loads/sec throughput" >> "$REPORT_FILE"
    extract_metric "$RESULTS_DIR/loader.log" "Avg load time" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
else
    echo "No results available" >> "$REPORT_FILE"
fi
echo >> "$REPORT_FILE"

# CNC results
echo "### CNC Scalability" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"
if [ -f "$RESULTS_DIR/cnc.log" ]; then
    echo '```' >> "$REPORT_FILE"
    extract_metric "$RESULTS_DIR/cnc.log" "Concurrent bots" >> "$REPORT_FILE"
    extract_metric "$RESULTS_DIR/cnc.log" "CPU usage" >> "$REPORT_FILE"
    extract_metric "$RESULTS_DIR/cnc.log" "Memory usage" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
else
    echo "No results available" >> "$REPORT_FILE"
fi
echo >> "$REPORT_FILE"

# Binary size results
echo "### Binary Sizes" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"
if [ -f "$RESULTS_DIR/binary_size.log" ]; then
    echo '```' >> "$REPORT_FILE"
    grep "PASS\|FAIL" "$RESULTS_DIR/binary_size.log" | head -n 10 >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
else
    echo "No results available" >> "$REPORT_FILE"
fi
echo >> "$REPORT_FILE"

# Success criteria summary
echo "---" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"
echo "## Success Criteria Summary" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Count passes/fails
total_tests=0
passed_tests=0

for log in "$RESULTS_DIR"/*.log; do
    if [ -f "$log" ]; then
        passes=$(grep -c "✓ PASS" "$log" 2>/dev/null || echo 0)
        fails=$(grep -c "✗ FAIL" "$log" 2>/dev/null || echo 0)
        total_tests=$((total_tests + passes + fails))
        passed_tests=$((passed_tests + passes))
    fi
done

if [ $total_tests -gt 0 ]; then
    pass_rate=$((passed_tests * 100 / total_tests))
    echo "**Pass Rate:** $passed_tests / $total_tests ($pass_rate%)" >> "$REPORT_FILE"
else
    echo "**Pass Rate:** N/A" >> "$REPORT_FILE"
fi

echo >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"
echo "## Detailed Logs" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"
echo "Full logs available in: \`$RESULTS_DIR\`" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Display report
cat "$REPORT_FILE"

echo
echo "========================================"
echo "Benchmark Suite Complete"
echo "========================================"
echo
echo "Results saved to: $RESULTS_DIR"
echo "Summary report: $REPORT_FILE"
echo
echo "To view detailed results:"
echo "  cat $RESULTS_DIR/scanner.log"
echo "  cat $RESULTS_DIR/loader.log"
echo "  cat $RESULTS_DIR/cnc.log"
echo "  cat $RESULTS_DIR/binary_size.log"
echo

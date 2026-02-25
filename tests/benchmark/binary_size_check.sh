#!/bin/bash
# Binary Size Optimization and Measurement - Mirai 2026
#
# Success Criteria:
# - <100KB stripped binaries (x86)
# - <80KB for embedded architectures (ARM, MIPS)
#
# Usage:
#   ./binary_size_check.sh [--build-all]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${PROJECT_ROOT}/build/release"

echo "========================================"
echo "Binary Size Optimization Check"
echo "========================================"
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build all architectures if requested
if [ "$1" == "--build-all" ]; then
    echo "Building all architectures..."
    
    # x86_64
    echo "  Building x86_64..."
    mkdir -p "${BUILD_DIR}/x86"
    cd "${BUILD_DIR}/x86"
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_C_FLAGS="-Os -ffunction-sections -fdata-sections" \
          -DCMAKE_EXE_LINKER_FLAGS="-Wl,--gc-sections -Wl,--strip-all" \
          "${PROJECT_ROOT}" > /dev/null 2>&1
    make -j$(nproc) > /dev/null 2>&1
    
    # ARM
    echo "  Building ARM..."
    mkdir -p "${BUILD_DIR}/arm"
    cd "${BUILD_DIR}/arm"
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_C_COMPILER=arm-linux-gnueabihf-gcc \
          -DCMAKE_C_FLAGS="-Os -ffunction-sections -fdata-sections -march=armv7-a" \
          -DCMAKE_EXE_LINKER_FLAGS="-Wl,--gc-sections -Wl,--strip-all" \
          "${PROJECT_ROOT}" > /dev/null 2>&1 || echo "    ARM toolchain not available, skipping..."
    
    # MIPS
    echo "  Building MIPS..."
    mkdir -p "${BUILD_DIR}/mips"
    cd "${BUILD_DIR}/mips"
    cmake -DCMAKE_BUILD_TYPE=Release \
          -DCMAKE_C_COMPILER=mips-linux-gnu-gcc \
          -DCMAKE_C_FLAGS="-Os -ffunction-sections -fdata-sections" \
          -DCMAKE_EXE_LINKER_FLAGS="-Wl,--gc-sections -Wl,--strip-all" \
          "${PROJECT_ROOT}" > /dev/null 2>&1 || echo "    MIPS toolchain not available, skipping..."
    
    echo "  Build complete"
    echo
fi

# Function to check binary size
check_binary_size() {
    local binary="$1"
    local max_size_kb="$2"
    local arch="$3"
    
    if [ ! -f "$binary" ]; then
        echo -e "  ${YELLOW}SKIP${NC} $arch: Binary not found"
        return
    fi
    
    # Get size before stripping
    local size_before=$(stat -f%z "$binary" 2>/dev/null || stat -c%s "$binary" 2>/dev/null)
    local size_before_kb=$((size_before / 1024))
    
    # Strip binary
    local stripped="${binary}.stripped"
    cp "$binary" "$stripped"
    strip "$stripped" 2>/dev/null || true
    
    # Get size after stripping
    local size_after=$(stat -f%z "$stripped" 2>/dev/null || stat -c%s "$stripped" 2>/dev/null)
    local size_after_kb=$((size_after / 1024))
    
    # Check against threshold
    if [ "$size_after_kb" -le "$max_size_kb" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} $arch: ${size_after_kb}KB <= ${max_size_kb}KB (before: ${size_before_kb}KB)"
    else
        echo -e "  ${RED}✗ FAIL${NC} $arch: ${size_after_kb}KB > ${max_size_kb}KB (before: ${size_before_kb}KB)"
    fi
    
    # Show section sizes
    if command -v size &> /dev/null; then
        echo "         Sections: $(size "$stripped" | tail -n1 | awk '{print "text="$1" data="$2" bss="$3}')"
    fi
    
    rm -f "$stripped"
}

# Function to suggest optimizations
suggest_optimizations() {
    echo
    echo "========================================"
    echo "Optimization Suggestions"
    echo "========================================"
    echo
    echo "Compiler Flags:"
    echo "  -Os                        # Optimize for size"
    echo "  -ffunction-sections        # Place functions in separate sections"
    echo "  -fdata-sections            # Place data in separate sections"
    echo "  -fno-unwind-tables         # Remove unwind tables"
    echo "  -fno-asynchronous-unwind-tables"
    echo
    echo "Linker Flags:"
    echo "  -Wl,--gc-sections          # Remove unused sections"
    echo "  -Wl,--strip-all            # Strip all symbols"
    echo "  -Wl,-z,norelro             # Disable RELRO"
    echo "  -Wl,--hash-style=gnu       # Use GNU hash style"
    echo
    echo "Code Optimizations:"
    echo "  - Remove debug logging in release builds"
    echo "  - Use static linking (if appropriate)"
    echo "  - Remove unused functions/data"
    echo "  - Use UPX compression (if acceptable)"
    echo
    echo "Example UPX compression:"
    echo "  upx --best --lzma binary"
    echo "  # Can reduce size by 50-70%"
    echo
}

# Check scanner binary
echo "Scanner Binary:"
check_binary_size "${BUILD_DIR}/x86/bin/scanner_modern" 100 "x86_64"
check_binary_size "${BUILD_DIR}/arm/bin/scanner_modern" 80 "ARM"
check_binary_size "${BUILD_DIR}/mips/bin/scanner_modern" 80 "MIPS"
echo

# Check loader binary
echo "Loader Binary:"
check_binary_size "${BUILD_DIR}/x86/bin/multi_ip_loader" 100 "x86_64"
check_binary_size "${BUILD_DIR}/arm/bin/multi_ip_loader" 80 "ARM"
check_binary_size "${BUILD_DIR}/mips/bin/multi_ip_loader" 80 "MIPS"
echo

# Check bot binary (if exists)
echo "Bot Binary:"
check_binary_size "${BUILD_DIR}/x86/bin/bot" 100 "x86_64"
check_binary_size "${BUILD_DIR}/arm/bin/bot" 80 "ARM"
check_binary_size "${BUILD_DIR}/mips/bin/bot" 80 "MIPS"
echo

# Detailed analysis for x86 binary
if [ -f "${BUILD_DIR}/x86/bin/scanner_modern" ]; then
    echo "========================================"
    echo "Detailed Analysis (x86_64 Scanner)"
    echo "========================================"
    echo
    
    binary="${BUILD_DIR}/x86/bin/scanner_modern"
    
    # File size
    echo "File size:"
    ls -lh "$binary" | awk '{print "  " $5 " (" $9 ")"}'
    echo
    
    # Section sizes
    if command -v size &> /dev/null; then
        echo "Section sizes:"
        size -A "$binary" | head -n 20
        echo
    fi
    
    # Symbol count
    if command -v nm &> /dev/null; then
        symbol_count=$(nm -a "$binary" 2>/dev/null | wc -l)
        echo "Symbol count: $symbol_count"
        echo
        
        # Largest symbols
        echo "Largest symbols (top 10):"
        nm -S --size-sort "$binary" 2>/dev/null | tail -n 10 || echo "  (nm -S not supported)"
        echo
    fi
    
    # Dependencies
    if command -v ldd &> /dev/null; then
        echo "Dynamic dependencies:"
        ldd "$binary" | sed 's/^/  /'
        echo
    fi
fi

suggest_optimizations

echo "========================================"
echo "Summary"
echo "========================================"
echo
echo "To optimize binaries:"
echo "1. Use release build: make release"
echo "2. Enable size optimizations: -Os -ffunction-sections -fdata-sections"
echo "3. Strip symbols: strip --strip-all binary"
echo "4. Use linker GC: -Wl,--gc-sections"
echo "5. Optionally compress: upx --best binary"
echo
echo "To rebuild all architectures:"
echo "  ./binary_size_check.sh --build-all"
echo

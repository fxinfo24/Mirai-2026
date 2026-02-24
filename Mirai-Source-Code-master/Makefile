# Mirai 2026 - Modern Makefile wrapper around CMake
# For backwards compatibility and convenience

.PHONY: all clean build debug release test docker help

# Default target
all: release

# Build directories
BUILD_DIR_DEBUG := build/debug
BUILD_DIR_RELEASE := build/release

help:
	@echo "Mirai 2026 Build System"
	@echo "======================="
	@echo ""
	@echo "Targets:"
	@echo "  make release         - Build optimized release version"
	@echo "  make debug           - Build debug version with sanitizers"
	@echo "  make test            - Run test suite"
	@echo "  make docker          - Build Docker images"
	@echo "  make clean           - Clean all build artifacts"
	@echo "  make install         - Install binaries (requires sudo)"
	@echo "  make format          - Format code with clang-format"
	@echo "  make lint            - Run static analysis"
	@echo ""
	@echo "Options:"
	@echo "  CROSS_COMPILE=1      - Enable cross-compilation for multiple architectures"
	@echo "  SANITIZE=1           - Enable AddressSanitizer and UBSan"

# Release build
release:
	@mkdir -p $(BUILD_DIR_RELEASE)
	@cd $(BUILD_DIR_RELEASE) && cmake -DCMAKE_BUILD_TYPE=Release ../..
	@cmake --build $(BUILD_DIR_RELEASE) --parallel $(shell nproc)
	@echo "✓ Release build complete: $(BUILD_DIR_RELEASE)/"

# Debug build with sanitizers
debug:
	@mkdir -p $(BUILD_DIR_DEBUG)
	@cd $(BUILD_DIR_DEBUG) && cmake -DCMAKE_BUILD_TYPE=Debug -DENABLE_SANITIZERS=ON ../..
	@cmake --build $(BUILD_DIR_DEBUG) --parallel $(shell nproc)
	@echo "✓ Debug build complete: $(BUILD_DIR_DEBUG)/"

# Run tests
test: debug
	@cd $(BUILD_DIR_DEBUG) && ctest --output-on-failure
	@echo "✓ All tests passed"

# Build Docker images
docker:
	@docker build -f docker/Dockerfile.bot -t mirai-2026-bot:latest .
	@docker build -f docker/Dockerfile.loader -t mirai-2026-loader:latest .
	@docker build -f docker/Dockerfile.cnc -t mirai-2026-cnc:latest .
	@echo "✓ Docker images built successfully"

# Clean build artifacts
clean:
	@rm -rf build/
	@rm -f compile_commands.json
	@echo "✓ Cleaned build artifacts"

# Install binaries
install: release
	@cd $(BUILD_DIR_RELEASE) && sudo cmake --install .
	@echo "✓ Installed to system"

# Format code
format:
	@find src/ tests/ -name '*.c' -o -name '*.h' | xargs clang-format -i
	@echo "✓ Code formatted"

# Static analysis
lint:
	@clang-tidy src/**/*.c -- -Isrc/common
	@echo "✓ Static analysis complete"

# Generate compile_commands.json for IDE integration
compile_commands: debug
	@ln -sf $(BUILD_DIR_DEBUG)/compile_commands.json .
	@echo "✓ Generated compile_commands.json"

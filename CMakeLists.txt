cmake_minimum_required(VERSION 3.20)
project(mirai-2026 VERSION 2.0.0 LANGUAGES C)

# Modern C standards
set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

# Build options
option(BUILD_BOT "Build bot component" ON)
option(BUILD_LOADER "Build loader component" ON)
option(BUILD_TESTS "Build test suite" ON)
option(ENABLE_SANITIZERS "Enable AddressSanitizer and UBSan" OFF)
option(ENABLE_LTO "Enable Link Time Optimization" ON)

# Compiler flags for security and performance
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wall -Wextra -Wpedantic -Werror")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wformat=2 -Wformat-security")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wstrict-prototypes -Wmissing-prototypes")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fstack-protector-strong")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -D_FORTIFY_SOURCE=2")

# Position Independent Execution
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

if(ENABLE_SANITIZERS)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fsanitize=address,undefined -fno-omit-frame-pointer")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -fsanitize=address,undefined")
endif()

if(ENABLE_LTO)
    set(CMAKE_INTERPROCEDURAL_OPTIMIZATION TRUE)
endif()

# Find dependencies
find_package(PkgConfig REQUIRED)
pkg_check_modules(JSON_C REQUIRED json-c)
pkg_check_modules(SODIUM REQUIRED libsodium)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src/common
    ${JSON_C_INCLUDE_DIRS}
    ${SODIUM_INCLUDE_DIRS}
)

# Common library (shared between bot and loader)
add_library(mirai_common STATIC
    src/common/config_loader.c
    src/common/logger.c
    src/common/util.c
    src/common/crypto.c
    src/common/kill_switch.c
    src/common/audit_log.c
    src/common/metrics.c
    src/common/random_secure.c
    src/common/socket_opts.c
    src/common/authorization.c
    src/common/pq_crypto.c
)

target_link_libraries(mirai_common
    ${JSON_C_LIBRARIES}
    ${SODIUM_LIBRARIES}
    curl
)

# Modern modules
# attack, scanner, evasion use Linux-specific APIs (epoll, iphdr, PTRACE_TRACEME).
# On Linux (including Docker/CI) build everything. On macOS build only what compiles cleanly.
add_subdirectory(src/ai_bridge)

if(CMAKE_SYSTEM_NAME STREQUAL "Linux")
    add_subdirectory(src/scanner)
    add_subdirectory(src/attack)
    add_subdirectory(src/evasion)

    # Bot component (depends on scanner + attack)
    if(BUILD_BOT)
        add_subdirectory(src/bot)
    endif()
else()
    message(STATUS "Non-Linux host detected (${CMAKE_SYSTEM_NAME}) — "
                   "skipping scanner/attack/evasion/bot (Linux-only modules). "
                   "Use Docker for full builds.")
endif()

# Loader component (lives in loader/ at project root, not src/loader)
if(BUILD_LOADER)
    # loader/ uses its own Makefile — skip CMake integration for now
    # add_subdirectory(loader)
endif()

# Tests
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Install targets
install(TARGETS mirai_common
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)

# Package configuration
set(CPACK_PACKAGE_NAME "mirai-2026")
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Modernized Mirai Research Platform")
include(CPack)

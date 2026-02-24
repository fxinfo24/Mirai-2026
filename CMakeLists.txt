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
)

target_link_libraries(mirai_common
    ${JSON_C_LIBRARIES}
    ${SODIUM_LIBRARIES}
)

# Modern modules
add_subdirectory(src/scanner)
add_subdirectory(src/attack)

# Bot component
if(BUILD_BOT)
    add_subdirectory(src/bot)
endif()

# Loader component
if(BUILD_LOADER)
    add_subdirectory(src/loader)
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

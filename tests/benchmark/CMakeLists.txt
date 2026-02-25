# Benchmark Suite - CMakeLists.txt

cmake_minimum_required(VERSION 3.20)

# Scanner benchmark
add_executable(scanner_benchmark
    scanner_benchmark.c
)

target_link_libraries(scanner_benchmark
    scanner_modern
    common
    pthread
)

target_include_directories(scanner_benchmark PRIVATE
    ${PROJECT_SOURCE_DIR}/src/scanner
    ${PROJECT_SOURCE_DIR}/src/common
)

# Loader benchmark
add_executable(loader_benchmark
    loader_benchmark.c
)

target_link_libraries(loader_benchmark
    pthread
)

# CNC benchmark
add_executable(cnc_benchmark
    cnc_benchmark.c
)

target_link_libraries(cnc_benchmark
    pthread
)

# Install benchmarks
install(TARGETS scanner_benchmark loader_benchmark cnc_benchmark
    RUNTIME DESTINATION bin/benchmark
)

# Install scripts
install(PROGRAMS
    binary_size_check.sh
    run_all_benchmarks.sh
    DESTINATION bin/benchmark
)

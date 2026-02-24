# Scanner module CMakeLists.txt

add_library(mirai_scanner STATIC
    scanner_modern.c
)

target_include_directories(mirai_scanner PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/src/common
)

target_link_libraries(mirai_scanner
    mirai_common
    pthread
)

# Enable warnings
target_compile_options(mirai_scanner PRIVATE
    -Wall -Wextra -Wpedantic -Werror
)

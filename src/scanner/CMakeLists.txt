# Scanner module CMakeLists.txt

add_library(mirai_scanner STATIC
    scanner_modern.c
    syn_scanner.c
    telnet_state_machine.c
)

target_include_directories(mirai_scanner PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/src/common
)

target_link_libraries(mirai_scanner
    mirai_common
    mirai_ai_bridge
    pthread
)

# Enable warnings
target_compile_options(mirai_scanner PRIVATE
    -Wall -Wextra -Wpedantic -Werror
)

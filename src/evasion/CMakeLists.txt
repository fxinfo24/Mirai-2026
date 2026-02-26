# Evasion / Detection Engine module

add_library(mirai_evasion STATIC
    detection_engine.c
)

target_include_directories(mirai_evasion PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/src/common
)

target_link_libraries(mirai_evasion
    mirai_common
)

target_compile_options(mirai_evasion PRIVATE
    -Wall -Wextra -Wpedantic
)

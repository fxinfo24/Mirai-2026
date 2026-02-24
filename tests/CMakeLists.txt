# Tests CMakeLists.txt

# Unit tests
add_executable(test_scanner unit/test_scanner.c)
target_link_libraries(test_scanner mirai_scanner mirai_common pthread)

add_executable(test_attack unit/test_attack.c)
target_link_libraries(test_attack mirai_attack mirai_common pthread)

add_executable(test_logger unit/test_logger.c)
target_link_libraries(test_logger mirai_common)

add_executable(test_config unit/test_config.c)
target_link_libraries(test_config mirai_common ${JSON_C_LIBRARIES})

# Add tests to CTest
add_test(NAME Scanner_Tests COMMAND test_scanner)
add_test(NAME Attack_Tests COMMAND test_attack)
add_test(NAME Logger_Tests COMMAND test_logger)
add_test(NAME Config_Tests COMMAND test_config)

# Integration tests (require more setup)
add_executable(test_integration integration/test_full_stack.c)
target_link_libraries(test_integration 
    mirai_scanner 
    mirai_attack 
    mirai_common 
    pthread
    ${JSON_C_LIBRARIES}
)

add_test(NAME Integration_Tests COMMAND test_integration)

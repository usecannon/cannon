#!/bin/bash

# This test verifies that when forge build fails, cannon prints stdout and stderr

# Create a temporary directory for this test
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

# Initialize a basic foundry project
forge init --no-git test-project
cd test-project

# Create a broken Solidity contract with a compilation error
cat > src/Broken.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Broken {
    // This will cause a compilation error - undefined type
    UndefinedType public myVar;

    // Missing semicolon to cause another error
    uint256 public anotherVar
}
EOF

# Create a simple cannonfile.toml
cat > cannonfile.toml << 'EOF'
name = "broken-test"
version = "1.0.0"

[contract.Broken]
artifact = "Broken"
EOF

# Try to build with cannon (this should fail)
# Capture both stdout and stderr
set +e
BUILD_OUTPUT=$($CANNON build 2>&1)
BUILD_EXIT_CODE=$?
set -e

# Clean up
cd /
rm -rf "$TEST_DIR"

echo "Actual output:"
echo "$BUILD_OUTPUT"

# Verify the build failed
if [ $BUILD_EXIT_CODE -eq 0 ]; then
  echo "ERROR: Build should have failed but succeeded"
  exit 1
fi

# Verify that the output contains forge build failure message
if ! echo "$BUILD_OUTPUT" | grep -q "forge build failed"; then
  echo "ERROR: Output should contain 'forge build failed' message"
  exit 1
fi

# Verify that the output contains stdout from forge
if ! echo "$BUILD_OUTPUT" | grep -q "forge stdout:"; then
  echo "ERROR: Output should contain 'forge stdout:' message"
  exit 1
fi

# Verify that the output contains stderr from forge (should have compilation error)
if ! echo "$BUILD_OUTPUT" | grep -q "forge stderr:"; then
  echo "ERROR: Output should contain 'forge stderr:' message"
  exit 1
fi

# Verify that the actual error message is present in stderr
# Look for common forge compilation error indicators
if ! echo "$BUILD_OUTPUT" | grep -qE "(Error|error|Compiler run failed|Failed to compile)"; then
  echo "ERROR: Output should contain compilation error details"
  exit 1
fi

echo "SUCCESS: Forge build failure is properly captured and displayed"

#!/bin/bash

# This script is used to run individual test scripts when necessary.
# It gives cannon executable contexts and takes in a file path of the script to run

# For example, if you don't want to run the entire e2e test suite with bats and simply want to test
# the build script, you can use this bash script to do so.

export CANNON_DIR="$(git rev-parse --show-toplevel)"
export CANNON="node $CANNON_DIR/packages/cli/bin/cannon.js"

scriptFile="$1"

bash $scriptFile

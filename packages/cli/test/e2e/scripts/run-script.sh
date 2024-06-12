#!/bin/bash

# This script is used to run individual test scripts when necessary.
# It gives cannon executable contexts and takes in a file path of the script to run

# For example, if you don't want to run the entire e2e test suite with bats and simply want to test
# the build script, you can use this bash script to do so.

export CANNON_REPO_DIR="$(git rev-parse --show-toplevel)"
export CANNON="node $CANNON_REPO_DIR/packages/cli/bin/cannon.js"
export CANNON_OP_EMITTER = "node ./optimism/cross-domain-messenger.js"

# Create temporary directory for tests
export WORKDIR="$(mktemp -d)"
export CANNON_DIRECTORY="$WORKDIR/cannondir"

#Creating cannon directory structure
mkdir $CANNON_DIRECTORY $CANNON_DIRECTORY/tags/ $CANNON_DIRECTORY/ipfs_cache/ $CANNON_DIRECTORY/metadata_cache/

scriptFile="$1"

bash $scriptFile

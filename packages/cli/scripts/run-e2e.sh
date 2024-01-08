#!/bin/bash

set -em

# Define error log file path
LOG_FILE="./error/test/error.log"

onlyFile=$1

export CANNON_DIR="$(git rev-parse --show-toplevel)"
export CANNON="node $CANNON_DIR/packages/cli/bin/cannon.js"

function clean_env () {
  export WORKDIR="$(mktemp -d)"
  export CANNON_DIRECTORY="$WORKDIR/cannondir"
  cd $WORKDIR
}

for f in e2e/${onlyFile:-*}; do
  clean_env
  echo -e "${BOLD}TEST $f${NC}"
  bash -x $CANNON_DIR/packages/cli/$f
  rm -rf $WORKDIR
done

echo "Executed Tests Passed."

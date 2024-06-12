#!/usr/bin/env bash

# DEFAULT BATS FUNCTION OVERRIDES

_setup_file() {
  export CANNON_REPO_DIR="$(git rev-parse --show-toplevel)"

  # Create temporary directory for tests
  export WORKDIR="$(mktemp -d)"
  export CANNON_DIRECTORY="$WORKDIR/cannondir"

  #Creating cannon directory structure
  mkdir $CANNON_DIRECTORY $CANNON_DIRECTORY/tags/ $CANNON_DIRECTORY/ipfs_cache/ $CANNON_DIRECTORY/metadata_cache/

  # CD into dir so any files created go in the tmp dir
  cd $CANNON_DIRECTORY
}

_setup() {
  load 'helpers/bats-support/load'
  load 'helpers/bats-assert/load'
  load 'helpers/bats-file/load'

  # get the containing directory of this file
  # use $BATS_TEST_FILENAME instead of ${BASH_SOURCE[0]} or $0,
  # as those will point to the bats executable's location or the preprocessed file respectively
  DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"

  # make executables in scripts/ visible to PATH so tests can run files without relative path
  PATH="$DIR/scripts/non-interactive:$DIR/scripts/interactive:$DIR/scripts/:$PATH"
}

# File post-run hook
_teardown_file() {
  if [ -e $WORKDIR ]; then
    rm -rf $WORKDIR
  fi
}

# Test post-hook
_teardown() {
  if [ -e  "$CANNON_DIRECTORY/settings.json" ]; then
    rm "$CANNON_DIRECTORY/settings.json"
  fi
}


# CUSTOM FUNCTIONS

# This function is used to log output during test execution
# Bats by default hides output during each test.
log() {
  echo "$@" >&3
}

# Copy remote network config over to temp dir
set_custom_config() {
  touch "$CANNON_DIRECTORY/settings.json"
  cp "$DIR/config/settings.json" "$CANNON_DIRECTORY/settings.json"
}

start_propagation_keeper() {
  # Start the propagation keeper
  $CANNON_KEEPER
}

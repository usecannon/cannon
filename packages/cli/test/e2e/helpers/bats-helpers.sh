#!/usr/bin/env bash

# DEFAULT BATS FUNCTION OVERRIDES

_setup_file() {
  export CANNON_REPO_DIR="$(git rev-parse --show-toplevel)"

  load_env "$CANNON_REPO_DIR/packages/cli/.env.test"

  require_env_var 'CANNON_E2E_RPC_URL_OPTIMISM'
  require_env_var 'CANNON_E2E_RPC_URL_ETHEREUM'
  require_env_var 'ETHERSCAN_API_KEY'

  # Create temporary directory for tests if necessary
  export CANNON_DIRECTORY="${CANNON_DIRECTORY:="$(mktemp -d)/.cannon"}"

  export CANNON_OP_EMITTER="node $CANNON_REPO_DIR/packages/cli/test/e2e/scripts/optimism/cross-domain-messenger.js"

  # Create cannon directory if necessary
  mkdir -p $CANNON_DIRECTORY

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

# Start the listening and propagate messages to anvil optimism fork
start_optimism_emitter() {
  $CANNON_OP_EMITTER &
  EMITTER_PID=$!
}

# Load environment variables from a file
# Usage: load_env "/path/to/.env"
load_env() {
  ENV_FILE="$1"
  if [[ -f "$ENV_FILE" ]]; then
    export $(cat "$ENV_FILE" | sed 's/#.*//g' | xargs)
  fi
}

# Require an environment variable to be set, exit if it isn't
# Usage: _require_env_var "VARIABLE_NAME"
require_env_var() {
  local var_name="$1"
  if [[ -z "${!var_name}" ]]; then
    echo "Error: Required environment variable $var_name is not set" >&2
    exit 1
  fi
}

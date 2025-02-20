#!/usr/bin/env bash

# DEFAULT BATS FUNCTION OVERRIDES

_setup_file() {
  export FOUNDRY_DISABLE_NIGHTLY_WARNING=true
  export CANNON_REPO_DIR="$(git rev-parse --show-toplevel)"

  load_env "$CANNON_REPO_DIR/packages/cli/.env.test"

  require_env_var 'CANNON_E2E_RPC_URL_OPTIMISM'
  require_env_var 'CANNON_E2E_RPC_URL_ETHEREUM'
  require_env_var 'CANNON_E2E_RPC_URL_SEPOLIA'
  require_env_var 'CANNON_E2E_RPC_URL_BASE'
  require_env_var 'CANNON_ETHERSCAN_API_KEY'

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

wait_for_rpc() {
    local rpc_url=$1
    local max_attempts=${2:-30}  # default 30 attempts
    local delay=${3:-1}         # default 1 second delay between attempts
    local attempt=1

    echo "Waiting for RPC endpoint to be ready..."

    while [ $attempt -le $max_attempts ]; do
        if cast block-number --rpc-url "$rpc_url" &>/dev/null; then
            echo "RPC endpoint is ready!"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: RPC not ready yet, retrying in ${delay}s..."
        sleep $delay
        attempt=$((attempt + 1))
    done

    echo "Error: RPC endpoint failed to respond after $max_attempts attempts"
    return 1
}

to_bytes32() {
  cast from-utf8 "$1" | cast to-bytes32 | sed -n '/^0x/p'
}

get_package_owner() {
  local _package_name="$1"
  local _package_hex=$(to_bytes32 "$_package_name")
  local _owner_bytes32=$(
    cast call \
      '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba' \
      'getPackageOwner(bytes32 _packageName)' \
      "$_package_hex" \
      --rpc-url "$ANVIL_URL_ETHEREUM" \
      | sed -n '/^0x/p'
  )
  local _owner_address=$(cast parse-bytes32-address "$_owner_bytes32" | sed -n '/^0x/p')
  echo "$_owner_address"
}

set_package_publisher() {
  local _package_name="$1"
  local _publisher_address="$2"
  local _package_hex=$(to_bytes32 "$_package_name")
  local _owner_address=$(get_package_owner "$_package_name")

  cast rpc anvil_impersonateAccount "$_owner_address" --rpc-url "$ANVIL_URL_ETHEREUM"
  cast send \
    '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba' \
    'setAdditionalPublishers(bytes32 _packageName, address[] memory _additionalPublishersEthereum, address[] memory _additionalPublishersOptimism)' \
    "$_package_hex" \
    "[$_publisher_address]" \
    "[$_publisher_address]" \
    --from "$_owner_address" \
    --unlocked \
    --rpc-url "$ANVIL_URL_ETHEREUM"
  cast rpc anvil_stopImpersonatingAccount "$_owner_address" --rpc-url "$ANVIL_URL_ETHEREUM"
  # this is necessary to ensure the RPC is updated on CI, as it takes a little longer
  sleep 15
}

#!/usr/bin/env bats

# This turns on native debug logs on bash
# set -x

# File pre-run hook
setup_file() {
  load helpers/bats-helpers.sh
  _setup_file

  export CANNON="node $CANNON_REPO_DIR/packages/cli/bin/cannon.js"

  cd $CANNON_DIRECTORY

  export CANNON_E2E_RPC_URL_OPTIMISM="${CANNON_E2E_RPC_URL_OPTIMISM:="https://optimism.gateway.tenderly.co"}"
  export CANNON_E2E_RPC_URL_ETHEREUM="${CANNON_E2E_RPC_URL_ETHEREUM:="https://mainnet.gateway.tenderly.co"}"
}

# File post-run hook
teardown_file() {
  load helpers/bats-helpers.sh
  _teardown_file
}

# Test pre-hook
setup() {
  load helpers/bats-helpers.sh
  _setup;
}

# Test post-hook
teardown() {
  load helpers/bats-helpers.sh
  _teardown
}


@test "Debug" {
  run debugging.sh
  echo $output
  assert_success
  # set_publisher "greeter-foundry" "0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba"
}

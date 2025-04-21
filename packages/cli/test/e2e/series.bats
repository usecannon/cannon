#!/usr/bin/env bats

# This turns on native debug logs on bash
# set -x

# File pre-run hook
setup_file() {
  load helpers/bats-helpers.sh
  _setup_file

  export CANNON="node $CANNON_REPO_DIR/packages/cli/bin/cannon.js"

  cd $CANNON_DIRECTORY

  # Fork OP to run tests against forked node
  anvil --fork-url "$CANNON_E2E_RPC_URL_OPTIMISM" --port 9546 --silent --accounts 1 --optimism &
  export ANVIL_PID_OP="$!"

  # Fork Mainnet to run tests against forked node
  anvil --fork-url "$CANNON_E2E_RPC_URL_ETHEREUM" --port 9545 --silent --accounts 1 &
  export ANVIL_PID="$!"

  export ANVIL_URL_ETHEREUM="http://127.0.0.1:9545"
  export ANVIL_URL_OPTIMISM="http://127.0.0.1:9546"

  if ! wait_for_rpc "$ANVIL_URL_ETHEREUM"; then
    echo "Failed to connect to RPC $ANVIL_URL_ETHEREUM"
    exit 1
  fi

  if ! wait_for_rpc "$ANVIL_URL_OPTIMISM"; then
    echo "Failed to connect to RPC $ANVIL_URL_OPTIMISM"
    exit 1
  fi
}

# File post-run hook
teardown_file() {
  load helpers/bats-helpers.sh
  _teardown_file

  kill -15 "$ANVIL_PID"
  kill -15 "$ANVIL_PID_OP"
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

@test "Build - Building foundry greeter example locally (Public Source Code)" {
  run build-foundry-local.sh
  echo $output
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry_latest_13370-main.txt"
}

@test "Build - Building foundry greeter example locally (Private Source Code)" {
  run build-foundry-local-private-source.sh
  echo $output
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry-private-source_latest_13370-main.txt"
}

@test "Build - Building foundry greeter example live" {
  set_custom_config
  run build-foundry-live.sh
  echo $output
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry_latest_1-main.txt"
}

@test "Build - Building hardhat greeter example" {
  set_custom_config
  run build-hardhat.sh
  echo $output
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter_latest_1-main.txt"
}

@test "Build - Building hardhat router example locally" {
  run build-router-local.sh
  echo $output
  assert_output --partial 'examples-router-architecture:0.0.1@main built for Cannon (Chain ID: 13370)'
  assert_file_exists "$CANNON_DIRECTORY/tags/examples-router-architecture_latest_13370-main.txt"
  assert_success
}

@test "Build - Building hardhat router example live network" {
  set_custom_config
  run build-router-live.sh
  echo $output
  assert_output --partial 'examples-router-architecture:0.0.1@main built on Ethereum (Chain ID: 1)'
  assert_file_exists "$CANNON_DIRECTORY/tags/examples-router-architecture_latest_1-main.txt"
  assert_success
}

@test "Diff - Find difference between contracts" {
  run diff.sh
  echo $output
  assert_success
}

@test "Partial Build - Ensure integrity of cloned packages in partial deployment state" {
  set_custom_config
  run build-foundry-partial.sh
  echo $output
  assert_failure 90
  assert_output --partial "Your deployment was not fully completed. Please inspect the issues listed above and resolve as necessary."
  assert_file_exists "$CANNON_DIRECTORY/tags/oracle-manager_latest_1-with-owned-greeter.txt"
  assert_file_exists "$CANNON_DIRECTORY/tags/owned-greeter_1.0.0_1-main.txt"
  assert_file_exists "$CANNON_DIRECTORY/tags/mintable-token_latest_1-main.txt"
  assert_file_exists "$CANNON_DIRECTORY/tags/trusted-multicall-forwarder_latest_1-main.txt"
  assert_file_exists "$CANNON_DIRECTORY/tags/trusted-multicall-forwarder_latest_1-with-oracle-manager.txt"
}

@test "Verify - Verify greeter packages" {
  set_custom_config
  run verify.sh
  echo $output
  assert_success
}

@test "Pin - Pin a package IPFS hash" {
  set_custom_config
  run pin.sh
  echo $output
  assert_success
}

@test "Register - Register a single package" {
  set_custom_config
  start_optimism_emitter
  run register.sh 1
  echo $output
  assert_output --partial 'Success - Package "package-one" has been registered'
  assert_success
}

@test "Register - Register multiple packages" {
  set_custom_config
  start_optimism_emitter
  run register.sh 2
  echo $output
  assert_output --partial 'Success - Package "first-package" has been registered'
  assert_output --partial 'Success - Package "second-package" has been registered'
  assert_success
}

@test "Publishers - Add a publisher on the Optimism network" {
  set_custom_config
  start_optimism_emitter
  run publishers.sh 1
  echo $output
  assert_output --partial 'Success - The publishers list has been updated!'
  assert_success
}

@test "Publishers - List publishers of package-one" {
  set_custom_config
  run publishers.sh 5
  echo $output
  assert_output --partial 'The package-one package lists the following publishers'
  assert_output --partial '- 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Mainnet) (Package Owner)'
  assert_output --partial '- 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Optimism)'
  assert_output --partial '- 0x000000000000000000000000000000000000dEaD (Optimism)'
  assert_success
}

@test "Publishers - Remove a publisher on the Optimism network" {
  set_custom_config
  start_optimism_emitter
  run publishers.sh 2
  echo $output
  assert_output --partial 'Success - The publishers list has been updated!'
  assert_success
}

@test "Publishers - Add a publisher on the Mainnet network" {
  set_custom_config
  start_optimism_emitter
  run publishers.sh 3
  echo $output
  assert_output --partial 'Success - The publishers list has been updated!'
  assert_success
}

@test "Publishers - Remove a publisher on the Mainnet network" {
  set_custom_config
  start_optimism_emitter
  run publishers.sh 4
  echo $output
  assert_output --partial 'Success - The publishers list has been updated!'
  assert_success
}

# This test is skipped because -- for some inexplicable reason, it is not
# possible to ge tteh package publisher changed and applied on foundry with
# CI (outside of CI, the issue does not appear)
# TODO: To reenable this test when things are inexplicably working better
#@test "Register & Publish - Registering and publishing the greeter package" {
#  set_custom_config
#  start_optimism_emitter
#  set_package_publisher "greeter-foundry" "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
#  run publish.sh 1
#  echo $output
  # assert_output --partial 'Package "greeter-foundry" not yet registered'
  # assert_output --partial 'Success - Package "greeter-foundry" has been registered'
#  assert_output --partial 'Transactions:'
#  assert_success
#}

#@test "Register & Publish - Publishing a package from an IPFS Reference" {
#  set_custom_config
#  start_optimism_emitter
#  set_package_publisher "greeter-foundry" "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
#  run publish.sh 3
#  echo $output
#  assert_success
#}

#@test "Publish - Publishing the greeter package failed due to no changes" {
#  set_custom_config
#  run publish.sh 2
#  echo $output
#  assert_output --partial "There isn't anything new to publish."
#  assert_failure
#}

#@test "Unpublish - Unpublishing the greeter package" {
#  set_custom_config
#  run unpublish.sh
#  echo $output
#  assert_output --partial "Success! (Transaction Hash: "
#  assert_success
#}

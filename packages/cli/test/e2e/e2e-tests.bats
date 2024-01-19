#!/usr/bin/env bats

# This turns on native debug logs on bash
# set -x

# File pre-run hook
setup_file() {
  load helpers/bats-helpers.sh
  _setup_file

  # Fork Mainnet to run tests against forked node
  anvil --fork-url https://ethereum.publicnode.com --port 9545 --silent &
  export ANVIL_PID="$!"
}

# File post-run hook
teardown_file() {
  load helpers/bats-helpers.sh
  _teardown_file

  kill -15 "$ANVIL_PID"
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

@test "Alter - Import contract " {
  run alter-import-contract.sh
  echo $output
  assert_output --partial 'ipfs://QmQZu9RscJYaiwqN2qEhkpEVGTFKPj6K54yV7WnX7CPKAt'
  assert_success
}

@test "Alter - Import invoke" {
  run alter-import-invoke.sh
  echo $output
  assert_output --partial 'ipfs://QmQZu9RscJYaiwqN2qEhkpEVGTFKPj6K54yV7WnX7CPKAt'
  assert_success
}

@test "Build - Building foundry greeter example" {
  set_custom_config # Uses custom settings.json
  run build-foundry.sh
  echo $output
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry_latest_1-main.txt"
}

@test "Build - Building hardhat greeter example" {
  set_custom_config # Uses custom settings.json
  run build-hardhat.sh
  echo $output
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter_latest_13370-main.txt"
}

@test "Verify - Verify greeter packages" {
  set_custom_config # Uses custom settings.json
  run verify.sh
  echo $output
  assert_success
}

@test "Fetch - Fetch synthetix:latest@main package" {
  run fetch.sh
  echo $output
  assert_output --partial 'Successfully fetched and saved deployment data'
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/synthetix_3.3.4_13370-main.txt"
}

@test "Publish - Publishing package" {
  set_custom_config # Uses custom settings.json
  run publish.sh
  echo $output
  assert_success
}

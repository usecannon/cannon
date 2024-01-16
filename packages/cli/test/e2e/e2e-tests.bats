#!/usr/bin/env bats

# File pre-run hook
setup_file() {
  load helpers/bats-helpers.sh
  _setup_file

  # Fork Mainnet to run tests against forked node
  run anvil --fork-url https://ethereum.publicnode.com --port 9545 --silent &
}

# Test pre-hook
setup() {
  load helpers/bats-helpers.sh
  _setup;
}

# File post-run hook
teardown_file() {
  load helpers/bats-helpers.sh
  _teardown_file
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
  set_config_remote
  run build-foundry.sh
  echo $output
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry_latest_1-main.txt"
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry_2.4.21_1-main.txt"
}

@test "Build - Building hardhat greeter example" {
  run build-hardhat.sh
  echo $output
  assert_success
}

@test "Verify - Verify greeter packages" {
  set_config_remote
  run verify.sh
  echo $output
  assert_success
}

@test "Publish - Publishing package to goerli registry" {
  set_config_remote
  run publish.sh
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

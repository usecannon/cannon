#!/usr/bin/env bats

# This turns on native debug logs on bash
# set -x

# File pre-run hook
setup_file() {
  load helpers/bats-helpers.sh
  _setup_file

  echo "============== Packing and installing CLI ==============" >&3
  # Adding npm pack built @usecannon/cli npm package
  cd $WORKDIR 
  cli=$(npm pack $CANNON_REPO_DIR/packages/cli)
  tar -xzf $cli

  # Installing tarball package dependencies
  cd $WORKDIR/package
  npm i
  
  export CANNON="node $WORKDIR/package/bin/cannon.js"

  cd $CANNON_DIRECTORY

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

@test "Decode - Cannon Registry publish transaction" {
  run decode.sh 1
  echo $output
  assert_output --partial 'function publish(bytes32 _packageName, bytes32 _variant, bytes32[] _packageTags, string _packageDeployUrl, string _packageMetaUrl)'
  assert_output --partial '0x429d7f0e'
  assert_output --partial 'bytes32 _packageName infinex'
  assert_output --partial 'bytes32 _variant 13370-N2O'
  assert_output --partial 'bytes32[] _packageTags'
  assert_output --partial 'bytes32 [0] 0.0.8'
  assert_output --partial 'string _packageDeployUrl "ipfs://QmQ1rygjYhCGRmgDDikMd2cBHuGkNwXGVXXc96QxNATKUe"'
  assert_output --partial 'string _packageMetaUrl "ipfs://QmNg2R3moWLsMLAVKYYzzoHUHjjmXBDnYqphvSCBSBXWsm"'
  assert_success
}

@test "Decode - Synthetix mintUsd transaction" {
  run decode.sh 2
  echo $output
  assert_output --partial 'function mintUsd(uint128 accountId, uint128 poolId, address collateralType, uint256 amount)'
  assert_output --partial '0xdf16a074'
  assert_output --partial 'uint128 accountId 4331793065'
  assert_output --partial 'uint128 poolId 1'
  assert_output --partial 'address collateralType 0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
  assert_output --partial 'uint256 amount 4000000000000000000'
  assert_success  
}

@test "Decode - Synthetix burnUsd transaction" {
  run decode.sh 3
  echo $output
  assert_output --partial 'function burnUsd(uint128 accountId, uint128 poolId, address collateralType, uint256 amount)'
  assert_output --partial '0xd3264e43'
  assert_output --partial 'uint128 accountId 6548889608'
  assert_output --partial 'uint128 poolId 1'
  assert_output --partial 'address collateralType 0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
  assert_output --partial 'uint256 amount 10000000000000000000'
  assert_success
}

@test "Decode - Synthetix burnUsd transaction (--json)" {
  run decode.sh 4
  echo $output
  assert_output --partial 'burnUsd'
  assert_output --partial '6548889608'
  assert_output --partial '1'
  assert_output --partial '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4'
  assert_output --partial '10000000000000000000'
  assert_success
}

@test "Alter - Import contract " {
  run alter-import-contract.sh
  echo $output
  assert_success
}

@test "Alter - Import invoke" {
  run alter-import-invoke.sh
  echo $output
  assert_success
}

@test "Build - Building foundry greeter example" {
  set_custom_config # Uses custom settings.json
  run build-foundry.sh
  echo $output
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry_latest_1-main.txt"
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry_latest_13370-main.txt"
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

@test "Fetch - Fetch synthetix:3.3.4@main" {
  run fetch.sh
  echo $output
  assert_output --partial 'Successfully fetched and saved deployment data for the following package: synthetix:3.3.4@main'
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/synthetix_3.3.4_13370-main.txt"
}

@test "Publish - Publishing greeter package" {  
  set_custom_config # Uses custom settings.json
  run publish.sh
  echo $output
  assert_success
}

@test "Inspect - Inspect Synthetix Sandbox" {
  run inspect.sh
  echo $output
  assert_file_exists "$CANNON_DIRECTORY/deployments/synthetix/CoreProxy.json"
  assert_success
}

@test "Trace - Trace transaction Data" {
  run trace.sh
  echo $output
  assert_success
}

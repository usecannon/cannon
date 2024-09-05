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

@test "Decode - TMF tuple array (stress)" {
  run decode.sh 5
  echo $output
  assert_output --partial 'calls'
  assert_success
}

@test "Decode - Synthetix configureCollateral function (Transaction Hash)" {
  run decode.sh 6
  echo $output
  assert_output --partial 'function configureCollateral(tuple config)'
  assert_output --partial '0x644cb0f3'
  assert_output --partial 'tuple config'
  assert_output --partial 'bool depositingEnabled true'
  assert_output --partial 'uint256 issuanceRatioD18 4000000000000000000'
  assert_output --partial 'uint256 liquidationRatioD18 1500000000000000000'
  assert_output --partial 'uint256 liquidationRewardD18 10000000000000000000'
  assert_output --partial 'bytes32 oracleNodeId 0x050be821f7e92c7ca8366e2fe01eee313272231d436c5deaed75b978d78f7116'
  assert_output --partial 'address tokenAddress 0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F'
  assert_output --partial 'uint256 minDelegationD18 10000000000000000000'
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

@test "Fetch - Fetch synthetix:3.3.4@main" {
  run fetch.sh
  echo $output
  assert_output --partial 'Successfully fetched and saved deployment data for the following package: synthetix:3.3.4@main'
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/synthetix_3.3.4_13370-main.txt"
}

@test "Inspect - Inspect Synthetix Sandbox" {
  run inspect.sh
  echo $output
  assert_file_exists "$CANNON_DIRECTORY/deployments/synthetix/CoreProxy.json"
  assert_success
}

@test "Trace - Trace Transaction Data" {
  run trace.sh
  echo $output
  assert_success
}

@test "Trace - Trace Verify Parsing" {
  run trace-output.sh
  echo $output
  assert_success
}

@test "Test - Basic Capabilities" {
  run test.sh
  echo $output
  assert_success
}

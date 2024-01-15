#!/usr/bin/env bats

setup_file() {
  export CANNON_DIR="$(git rev-parse --show-toplevel)"
  export CANNON="node $CANNON_DIR/packages/cli/bin/cannon.js"
  
  # Create temporary directory for tests
  export WORKDIR="$(mktemp -d)"
  export CANNON_DIRECTORY="$WORKDIR/cannondir"

  export CANNON_PRIVATE_KEY=""

  #Creating cannon directory structure
  mkdir $CANNON_DIRECTORY $CANNON_DIRECTORY/tags/ $CANNON_DIRECTORY/ipfs_cache/ $CANNON_DIRECTORY/metadata_cache/

  cd $CANNON_DIRECTORY  
}

setup() {
  load './helpers/bats-support/load'
  load './helpers/bats-assert/load'
  load './helpers/bats-file/load'

  # get the containing directory of this file
  # use $BATS_TEST_FILENAME instead of ${BASH_SOURCE[0]} or $0,
  # as those will point to the bats executable's location or the preprocessed file respectively
  DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"

  # make executables in scripts/ visible to PATH so tests can run files without relative path
  PATH="$DIR/scripts/non-interactive:$DIR/scripts/interactive:$DIR/scripts/:$PATH"
}

# Copy local network config over to temp dir
set_config_local() {
  touch "$CANNON_DIRECTORY/settings.json"
  cp "$DIR/config/local-settings.json" "$CANNON_DIRECTORY/settings.json"
}

# Copy remote network config over to temp dir
set_config_remote() {
  touch "$CANNON_DIRECTORY/settings.json"
  cp "$DIR/config/remote-settings.json" "$CANNON_DIRECTORY/settings.json"
}

# Test post-hook
teardown_file() {
  if [ -e $WORKDIR]; then
    rm -rf $WORKDIR
  fi
}

teardown() {
  if [ -e  "$CANNON_DIRECTORY/settings.json"]; then
    rm "$CANNON_DIRECTORY/settings.json"
  fi
}

# This function is used to log output during test execution
# Bats by default hides output during each test.
log() {
  echo "$@" >&3
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
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry_latest_5-main.txt"
  assert_file_exists "$CANNON_DIRECTORY/tags/greeter-foundry_2.4.21_5-main.txt"
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

@test "Synthetix CI - Build Synthetix V3 contracts" {
  run downstream-ci-synthetix-v3.sh
  echo $output
  assert_success
}

@test "Synthetix CI - Build Synthetix Deployments contracts" {
  run downstream-ci-synthetix-deployments.sh
  echo $output
  assert_output --partial 'synthetix-omnibus:3.3.5@andromeda built on Base Mainnet (Chain ID: 8453)'
  assert_success
  assert_file_exists "$CANNON_DIRECTORY/tags/synthetix-omnibus_3.3.5_8453-andromeda.txt"
}

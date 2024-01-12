#!/usr/bin/env bats

setup_file() {
  export CANNON_DIR="$(git rev-parse --show-toplevel)"
  export CANNON="node $CANNON_DIR/packages/cli/bin/cannon.js"

  # get the containing directory of this file
  # use $BATS_TEST_FILENAME instead of ${BASH_SOURCE[0]} or $0,
  # as those will point to the bats executable's location or the preprocessed file respectively
  DIR="$( cd "$( dirname "$BATS_TEST_FILENAME" )" >/dev/null 2>&1 && pwd )"

  # make executables in scripts/ visible to PATH so tests can run files without relative path
  PATH="$DIR/scripts/non-interactive:$DIR/scripts/interactive:$DIR/scripts/:$PATH"

  # Create temporary directory for tests
  export WORKDIR="$(mktemp -d)"
  export CANNON_DIRECTORY="$WORKDIR/cannondir"

  #Creating cannon directory structure
  mkdir $CANNON_DIRECTORY $CANNON_DIRECTORY/tags/ $CANNON_DIRECTORY/ipfs_cache/ $CANNON_DIRECTORY/metadata_cache/
  echo {} >> "$CANNON_DIRECTORY/settings.json"
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
setup_config_local() {
  cp "$DIR/config/local-settings.json" "$CANNON_DIRECTORY/settings.json"
}

# Copy remote network config over to temp dir
setup_config_remote() {
  cp "$DIR/config/remote-settings.json" "$CANNON_DIRECTORY/settings.json"
}

# Test post-hook
teardown_file() {
  if [ -e $WORKDIR]; then
    rm -rf $WORKDIR
  fi
}

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

@test "Build - building foundry example" {
  run build-foundry.sh
  echo $output
  assert_success
  assert_exists "$CANNON_DIRECTORY/tags/greeter-foundry_2.4.21_13370-main.txt"
}

@test "Build - building hardhat example" {
  run build-hardhat.sh
  echo $output
  assert_success
}

@test "Publish - publishing package to cannon network" {
  run publish-cannon.sh
  echo $output
  assert_success
}

@test "Publish - publishing package to a remote network" {
  run publish-remote.sh
  echo $output
  assert_success
}

@test "Fetch - Fetch synthetix:latest@main package" {
  run fetch.sh
  echo $output
  assert_success
  assert_exists "$CANNON_DIRECTORY/tags/synthetix_latest_13370-main.txt"
}

@test "Run - Run package" {
  run run.sh
  echo $output
  assert_success
}

@test "Verify - Verify package" {
  run verify.sh
  echo $output
  assert_success
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
  assert_exists "$CANNON_DIRECTORY/tags/synthetix-omnibus_3.3.5_8543-andromeda.txt"
}

#!/usr/bin/env bats

setup_file() {
  export CANNON_DIR="$(git rev-parse --show-toplevel)"
  export CANNON="node $CANNON_DIR/packages/cli/bin/cannon.js"

  # Create temporary directory for tests
  export WORKDIR="$(mktemp -d)"
  export CANNON_DIRECTORY="$WORKDIR/cannondir"
}

setup(){
  load './helpers/bats-support/load'
  load './helpers/bats-assert/load'
  load './helpers/bats-file/load'

  # get the containing directory of this file
  # use $BATS_TEST_FILENAME instead of ${BASH_SOURCE[0]} or $0,
  # as those will point to the bats executable's location or the preprocessed file respectively
  DIR="$( cd "$( dirname "$BATS_TEST_FILENAME" )" >/dev/null 2>&1 && pwd )"

  # make executables in scripts/ visible to PATH so tests can run files without relative path
  PATH="$DIR/scripts/non-interactive:$DIR/scripts/interactive:$DIR/scripts/:$PATH"
}

# Test post-hook
teardown_file() {
  if [ -e $WORKDIR]; then
    rm -rf $WORKDIR
  fi
}

log() {
  local -r log="log-${BATS_TEST_FILENAME##*/}"
  echo "$@" >&3
}

@test "publish-interactive: publishing package to a local network" {
   run script.exp
   echo $output
   assert_success
}

@test "alter: import contract" {
   run alter-import-contract.sh
   echo $output
   assert_output --partial 'ipfs://QmQZu9RscJYaiwqN2qEhkpEVGTFKPj6K54yV7WnX7CPKAt'
   assert_success
}

@test "alter: import invoke" {
   run alter-import-invoke.sh
   echo $output
   assert_output --partial 'ipfs://QmQZu9RscJYaiwqN2qEhkpEVGTFKPj6K54yV7WnX7CPKAt'
   assert_success
}

@test "build: building with foundry" {
   run build-foundry.sh
   echo $output
   assert_success
}

@test "build: building with hardhat" {
   run build-hardhat.sh
   echo $output
   assert_success
}

@test "publish: publishing package to a local network" {
   run publish.sh
   echo $output
   assert_success
}

@test "fetch: fetch package" {
   run fetch.sh
   echo $output
   assert_success
}

@test "run: run package" {
   run run.sh
   echo $output
   assert_success
}

@test "verify: verify package" {
   run verify-build.sh
   echo $output
   assert_success
}

@test "Build Synthetix V3 contracts" {
   run downstream-ci-synthetix-v3.sh
   echo $output
   assert_success
}

@test "Build Synthetix Deployments contracts" {
   run downstream-ci-synthetix-deployments.sh
   echo $output
   assert_output --partial 'synthetix-omnibus:3.3.5@andromeda built on Base Mainnet (Chain ID: 8453)'
   assert_success
}

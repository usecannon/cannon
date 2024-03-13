#!/usr/bin/env bats

# This turns on native debug logs on bash
# set -x

# File pre-run hook
setup_file() {
  load helpers/bats-helpers.sh
  _setup_file
}

# Test pre-hook
setup() {
  load helpers/bats-helpers.sh
  _setup
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

@test "Synthetix CI - Build Synthetix V3 contracts" {
  run downstream-ci-synthetix-v3.sh
  echo $output
  assert_success
}

@test "Synthetix CI - Build Synthetix Deployments contracts" {
  run downstream-ci-synthetix-deployments.sh
  echo $output
  assert_line --regexp 'synthetix-omnibus:.+@andromeda built on Base \(Chain ID: 8453\)'
  assert_success
}

setup() {
    load '../test_helper/bats-support/load'
    load '../test_helper/bats-assert/load'

    # get the containing directory of this file
    # use $BATS_TEST_FILENAME instead of ${BASH_SOURCE[0]} or $0,
    # as those will point to the bats executable's location or the preprocessed file respectively
    DIR="$( cd "$( dirname "$BATS_TEST_FILENAME" )" >/dev/null 2>&1 && pwd )"
    # make executables in src/ visible to PATH
    PATH="$PROJECT_ROOT/packages/cli/test/e2e:$PATH"

    # Export cannon executable as env var
    export CANNON="node bin/cannon.js"
}

teardown() {
  if [ -e $HOME/.local/share/cannon-untest]; then
    mv $HOME/.local/share/cannon-untest/ $HOME/.local/share/cannon/
  fi
}

@test "alter: import contract" {
   pwd
   run ./test/e2e/alter-import-contract.sh
   echo $output
   assert_output --partial 'ipfs://QmQZu9RscJYaiwqN2qEhkpEVGTFKPj6K54yV7WnX7CPKAt'
}

@test "alter: import invoke" {
   run ./test/e2e/alter-import-invoke.sh
   echo $output
   assert_output --partial 'ipfs://QmQZu9RscJYaiwqN2qEhkpEVGTFKPj6K54yV7WnX7CPKAt'
}

@test "build: building with foundry" {
   run ./test/e2e/build-foundry.sh
   echo $output
   assert_output --partial '💥 greeter-foundry:2.4.21@main built for Cannon (Chain ID: 13370)'
}

@test "build: building with hardhat" {
   run ./test/e2e/build-hardhat.sh
   echo $output
   assert_output --partial '💥 greeter:2.10.0@main built for Cannon (Chain ID: 13370)'
}

@test "publish: publishing package to a local network" {
   run ./test/e2e/publish.sh
   echo $output
   assert_output --partial '💥 greeter:2.10.0@main built for Cannon (Chain ID: 13370)'
}

@test "run: run package" {
   run ./test/e2e/run.sh
   echo $output
   assert_output --partial '💥 greeter:2.10.0@main built for Cannon (Chain ID: 13370)'
}

@test "verify: verify package" {
   run ./test/e2e/verify-build.sh
   echo $output
   assert_output --partial '💥 greeter:2.10.0@main built for Cannon (Chain ID: 13370)'
}

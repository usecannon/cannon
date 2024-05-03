cd $CANNON_REPO_DIR/examples/sample-foundry-project
$CANNON test

# run the tests again
output=$($CANNON test cannonfile.toml)

[[ ! "$output" = "0 failed, 0 skipped" ]]

# test running on a fork
output=$($CANNON test --provider-url https://ethereum-rpc.publicnode.com || true)

# test is expected to fail, but it should run
[[ ! "$output" = "1 failed, 0 skipped" ]]

cd $CANNON_REPO_DIR/examples/sample-foundry-project
$CANNON test

# run the tests again
output=$($CANNON test cannonfile.toml)

[[ ! "$output" = "0 failed, 0 skipped" ]]

# test running on a fork
$CANNON test --provider-url https://ethereum-rpc.publicnode.com


# test building the package again with no private key supplied
$CANNON build $CANNON_REPO_DIR/examples/sample-foundry-project/cannonfile.toml --chain-id 13370

# inspect, verify that some important properties of the build are preserved
inspectResult=$($CANNON inspect greeter-foundry:latest)

# deploy status is complete
[[ "$inspectResult" =~ "Deploy Status: complete" ]]
# no source codes should have been included
[[ "$inspectResult" =~ "0 sources included" ]]

$CANNON build $CANNON_REPO_DIR/examples/sample-foundry-project/cannonfile.toml --private-key ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --chain-id 1

# test building the package again (should execute nothing)
output=$($CANNON build $CANNON_REPO_DIR/examples/sample-foundry-project/cannonfile.toml --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --chain-id 1)

[[ ! "$output" =~ "Executing" ]]

# test building the package again with no private key supplied
$CANNON build $CANNON_REPO_DIR/examples/sample-foundry-project/cannonfile.toml

# inspect, verify that some important properties of the build are preserved
inspectResult=$($CANNON inspect greeter-foundry:latest)

# deploy status is complete
[[ "$inspectResult" =~ "Deploy Status: complete" ]]
# no source codes should have been included
[[ "$inspectResult" =~ "0 sources included" ]]

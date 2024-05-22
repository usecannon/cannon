$CANNON build $CANNON_REPO_DIR/examples/sample-foundry-project/cannonfile.toml --private-key ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --chain-id 1

# test building the package again (should execute nothing)
output=$($CANNON build $CANNON_REPO_DIR/examples/sample-foundry-project/cannonfile.toml --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --chain-id 1)

[[ ! "$output" =~ "Executing" ]]

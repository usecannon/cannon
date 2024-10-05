cd $CANNON_REPO_DIR/examples/sample-hardhat-project;
pnpm i
PROVIDER_URL=http://127.0.0.1:9545 PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 pnpm exec hardhat cannon:build --network mainnet 
cd -

# inspect, verify that some important properties of the build are preserved
inspectResult=$($CANNON inspect greeter:latest)

# deploy status is complete
[[ "$inspectResult" =~ "Deploy Status: complete" ]]
# some source codes should have been included
[[ ! "$inspectResult" =~ "0 sources included" ]]

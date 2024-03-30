cd $CANNON_REPO_DIR/examples/sample-hardhat-project;
npm i
npx hardhat cannon:build
npx hardhat cannon:build --network mainnet
cd -

# inspect, verify that some important properties of the build are preserved
inspectResult=$($CANNON inspect greeter:latest)

# deploy status is complete
[[ "$inspectResult" =~ "Deploy Status: complete" ]]
# some source codes should have been included
[[ ! "$inspectResult" =~ "0 sources included" ]]

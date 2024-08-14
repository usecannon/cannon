
# test building the package again with no private key supplied
$CANNON build $CANNON_REPO_DIR/examples/sample-foundry-project/cannonfile.toml

# the diff command should say there is no diffs immediately after build
$CANNON diff greeter-foundry $CANNON_REPO_DIR/examples/sample-foundry-project

# lets change one of the files by adding a comment
echo "# some extra comment" >> $CANNON_REPO_DIR/examples/sample-foundry-project/src/Greeter.sol

# the diff command should say there is no diffs if we exclude the file
$CANNON diff greeter-foundry $CANNON_REPO_DIR/examples/sample-foundry-project --match-contract lib
$CANNON diff greeter-foundry $CANNON_REPO_DIR/examples/sample-foundry-project --match-source console

# the diff command should say there is a diff if we let it scan everything
! $CANNON diff greeter-foundry $CANNON_REPO_DIR/examples/sample-foundry-project

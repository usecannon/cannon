
# test building the package again with no private key supplied
$CANNON build $CANNON_REPO_DIR/examples/router-architecture/cannonfile.toml

# the diff command should say there is no diffs immediately after build
$CANNON diff greeter-foundry $CANNON_REPO_DIR/examples/router-architecture

# lets change one of the files by adding a comment
echo "# some extra comment" >> $CANNON_REPO_DIR/examples/router-architecture/src/Greeter.sol

# the diff command should say there is no diffs if we exclude the file
$CANNON diff greeter-foundry $CANNON_REPO_DIR/examples/router-architecture --match-contract lib
$CANNON diff greeter-foundry $CANNON_REPO_DIR/examples/router-architecture --match-source console

# the diff command should say there is a diff if we let it scan everything
! $CANNON diff greeter-foundry $CANNON_REPO_DIR/examples/router-architecture

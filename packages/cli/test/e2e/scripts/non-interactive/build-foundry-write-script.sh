$CANNON build \
    $CANNON_REPO_DIR/examples/sample-foundry-project/cannonfile.toml \
    --wipe \
    --write-script-format $1 \
    --write-script /tmp/build-foundry-write-script.${1}

# make sure the outputted write script file matches the model file
cmp \
    /tmp/build-foundry-write-script.${1} \
    $CANNON_REPO_DIR/examples/sample-foundry-project/write-script-models/build-foundry-write-script.$1

$CANNON build \
    $CANNON_REPO_DIR/examples/sample-foundry-project/cannonfile.toml \
    --wipe \
    --write-script-format $1 \
    --write-script /tmp/build-foundry-write-script.${1}

# make sure the outputted write script file matches the model file
# check first 20 lines of the generated file against the model file
head -n 20 /tmp/build-foundry-write-script.${1} > /tmp/generated-head.txt
head -n 20 $CANNON_REPO_DIR/examples/sample-foundry-project/write-script-models/build-foundry-write-script.$1 > /tmp/model-head.txt
cmp /tmp/generated-head.txt /tmp/model-head.txt
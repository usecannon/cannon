#!/bin/bash
git clone --depth=1 https://github.com/Synthetixio/synthetix-v3
cd synthetix-v3
yarn

cli=$(npm pack $CANNON_REPO_DIR/packages/cli)
builder=$(npm pack $CANNON_REPO_DIR/packages/builder)

yarn add ./$cli
yarn add ./$builder

yarn run build

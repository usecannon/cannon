#!/bin/bash
git clone --depth=1 https://github.com/Synthetixio/synthetix-v3
cd synthetix-v3
yarn

cli=$(npm pack $CANNON_REPO_DIR/packages/cli)
builder=$(npm pack $CANNON_REPO_DIR/packages/builder)
hardhat=$(npm pack $CANNON_REPO_DIR/packages/hardhat-cannon)

yarn add $CANNON_DIRECTORY/$cli
yarn add $CANNON_DIRECTORY/$builder
yarn add $CANNON_DIRECTORY/$hardhat

yarn build

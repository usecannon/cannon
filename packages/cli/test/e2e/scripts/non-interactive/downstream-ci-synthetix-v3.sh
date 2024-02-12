#!/bin/bash

git clone --depth=1 https://github.com/Synthetixio/synthetix-v3
cd synthetix-v3
yarn link $CANNON_REPO_DIR/packages/cli
yarn link $CANNON_REPO_DIR/packages/hardhat-cannon
yarn

yarn build

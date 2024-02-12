#!/bin/bash
git clone --depth=1 https://github.com/Synthetixio/synthetix-deployments
cd synthetix-deployments
yarn link $CANNON_REPO_DIR/packages/builder 
yarn link $CANNON_REPO_DIR/packages/cli 
yarn link $CANNON_REPO_DIR/packages/hardhat-cannon
yarn

yarn cannon build omnibus-base-mainnet-andromeda.toml \
  --port 8545 \
  --dry-run \
  --upgrade-from synthetix-omnibus:latest@andromeda \
  --chain-id 8453 \
  --provider-url https://base.publicnode.com


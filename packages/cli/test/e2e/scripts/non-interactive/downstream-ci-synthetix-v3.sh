#!/bin/bash

git clone --depth=1 https://github.com/Synthetixio/synthetix-v3
cd synthetix-v3
yarn
yarn link --all $CANNON_DIRECTORY

yarn build

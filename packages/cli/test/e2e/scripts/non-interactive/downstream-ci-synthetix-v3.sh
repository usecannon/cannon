#!/bin/bash

if [ ! -d 'synthetix-v3']; then
  git clone --depth=1 https://github.com/Synthetixio/synthetix-v3
  cd synthetix-v3
  yarn
  yarn link --all $CANNON_DIR 
fi

cd synthetix-v3

yarn build

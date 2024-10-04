#!/bin/bash
git clone --depth=1 https://github.com/FuzzB0t/partial-build-example
cd partial-build-example
pnpm i

$CANNON build cannonfile.withcloned.toml --chain-id 1

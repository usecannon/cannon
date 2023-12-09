#!/bin/bash

set -e

export CANNON="node bin/cannon.js"

for f in e2e/*; do
  echo "TEST $f"
  bash $f 
done

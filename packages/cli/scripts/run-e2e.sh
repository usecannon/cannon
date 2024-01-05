#!/bin/bash

set -e

BOLD='\033[0;37;1m' # Bold white
NC='\033[0m' # No Color

export CANNON="node bin/cannon.js"

function clean_env () {
  if [ -e $HOME/.local/share/cannon ]; then
    mv $HOME/.local/share/cannon $HOME/.local/share/cannon-untest
  fi
}

for f in test/e2e/*; do
  clean_env
  echo -e "${BOLD}TEST $f${NC}"
  bash $f 
  rm -rf $HOME/.local/share/cannon-untest
done

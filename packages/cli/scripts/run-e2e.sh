#!/bin/bash

set -em

# Define error log file path
LOG_FILE="./error/test/error.log"

# Function to log unhandled errors
function handle_error() {
  echo "Unhandled error occurred: $1" >> "$LOG_FILE"
  exit 1
}

# Set up error handling
trap 'handle_error "$BASH_COMMAND"' ERR

function setup_env() {
  if [ -e $HOME/.local/share/cannon ]; then
    mv $HOME/.local/share/cannon/ $HOME/.local/share/cannon-untest/
    cp ./config/settings.json $HOME/.local/share/cannon/settings.json
  fi
}

function clean_env() {
  if [ -e $HOME/.local/share/cannon-untest ]; then
    mv $HOME/.local/share/cannon-untest/ $HOME/.local/share/cannon
    rm -rf $HOME/.local/share/cannon-untest
  fi
}

BOLD='\033[0;37;1m' # Bold white
NC='\033[0m' # No Color

export CANNON="node bin/cannon.js"

setup_env
for f in test/e2e/*.sh; do
  [ -f "$f" ] || break
  echo -e "${BOLD}TEST $f${NC}"
  bash $f 
done
clean_env

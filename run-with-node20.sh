#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$(dirname "$0")"
nvm use 20.11.1
npm install

echo "Creating necessary directories..."
mkdir -p .warp_memory/local_db
mkdir -p .warp_hitl

# If a command was passed, run it, otherwise run the default
if [ $# -gt 0 ]; then
  echo "Running npm script: $1"
  npm run $1
else
  echo "Running application..."
  node --loader ts-node/esm src/index.ts
fi

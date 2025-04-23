#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$(dirname "$0")"
nvm use 20.11.1
npm install

# Ensure .warp_memory directory exists
mkdir -p .warp_memory/local_db

echo "Running enhancements tests..."
NODE_OPTIONS="--no-warnings --experimental-modules --experimental-specifier-resolution=node" node --loader ts-node/esm src/tests/enhancements-test.ts

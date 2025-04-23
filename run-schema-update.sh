#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$(dirname "$0")"
nvm use 20.11.1
npm install

# Ensure the .warp_memory directory exists
mkdir -p .warp_memory

echo "Running update-schema.js..."
NODE_OPTIONS="--experimental-modules --experimental-specifier-resolution=node" node dist/db/schema/update-schema.js

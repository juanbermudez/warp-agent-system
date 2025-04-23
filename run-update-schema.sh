#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

cd "$(dirname "$0")"
nvm use 20.11.1
npm install

echo "Running update-schema.js..."
NODE_PATH=./dist node --experimental-specifier-resolution=node dist/db/schema/update-schema.js

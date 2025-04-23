#!/bin/bash

# Check if Node.js version is >= 20
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ $NODE_VERSION -lt 20 ]; then
  echo "Error: Node.js version 20 or higher is required."
  echo "Current version: $(node -v)"
  echo "Please run 'nvm use 20' or use the run-with-node20.sh script."
  exit 1
fi

# Ensure .warp_memory directory exists
mkdir -p .warp_memory

# Check if Supabase config exists
if [ ! -f .warp_memory/supabase-auth-config.json ]; then
  echo "Supabase auth configuration not found."
  echo "Please run 'npm run setup:auth' first."
  exit 1
fi

# Run the MCP server
echo "Starting MCP server with Supabase authentication..."
npm run dev

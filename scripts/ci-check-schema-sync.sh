#!/bin/bash
# ci-check-schema-sync.sh
# Checks that Zod schemas are in sync with GraphQL schema

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR=$(mktemp -d)
TEMP_SCHEMA_PATH="$TEMP_DIR/temp-schema.ts"
ACTUAL_SCHEMA_PATH="./src/types/generated/ckg-schema.ts"
GRAPHQL_SCHEMA_PATH="./src/db/schema/schema.graphql"

echo "Checking if Zod schemas are in sync with GraphQL schema..."

# Generate fresh Zod schemas from current GraphQL schema
echo "Generating temporary Zod schemas from current GraphQL schema..."
npm run schema:generate-zod -- -s $GRAPHQL_SCHEMA_PATH -o $TEMP_SCHEMA_PATH

# Check if the generated schema matches the committed one
if ! diff -q "$TEMP_SCHEMA_PATH" "$ACTUAL_SCHEMA_PATH" > /dev/null; then
  echo "❌ ERROR: Zod schemas are out of sync with GraphQL schema!"
  echo "Please regenerate Zod schemas by running: npm run schema:generate-zod"
  echo ""
  echo "Diff between current and expected schemas:"
  diff -u "$ACTUAL_SCHEMA_PATH" "$TEMP_SCHEMA_PATH" | grep -E "^[\+\-]" | head -n 20
  
  # Clean up
  rm -rf "$TEMP_DIR"
  exit 1
else
  echo "✅ Zod schemas are in sync with GraphQL schema!"
  
  # Clean up
  rm -rf "$TEMP_DIR"
  exit 0
fi
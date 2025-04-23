#!/bin/bash
# Script to integrate the activity schema into the CKG schema

set -e # Exit on error

MAIN_SCHEMA_PATH="./src/db/schema/schema.graphql"
ACTIVITY_SCHEMA_PATH="./src/schema/activity-schema.graphql"
BACKUP_SCHEMA_PATH="./src/db/schema/schema.graphql.bak"

echo "Starting activity schema integration..."

# Check if files exist
if [ ! -f "$MAIN_SCHEMA_PATH" ]; then
  echo "Error: Main schema file not found at $MAIN_SCHEMA_PATH"
  exit 1
fi

if [ ! -f "$ACTIVITY_SCHEMA_PATH" ]; then
  echo "Error: Activity schema file not found at $ACTIVITY_SCHEMA_PATH"
  exit 1
fi

# Check if activity schema is already integrated
if grep -q "type Activity implements Entity" "$MAIN_SCHEMA_PATH"; then
  echo "Activity schema is already integrated. No changes needed."
  exit 0
fi

echo "Activity schema not found in main schema, proceeding with integration..."

# Create a backup of the main schema
cp "$MAIN_SCHEMA_PATH" "$BACKUP_SCHEMA_PATH"
echo "Backup created at $BACKUP_SCHEMA_PATH"

# Append activity schema to main schema
echo -e "\n# Activity Tracking Schema\n" >> "$MAIN_SCHEMA_PATH"
cat "$ACTIVITY_SCHEMA_PATH" >> "$MAIN_SCHEMA_PATH"
echo "Activity schema integrated successfully"

# Initialize schema with new activity types
echo "Initializing schema with new activity types..."
npm run schema:init
echo "Schema initialization completed successfully"

# Generate Zod schemas
echo "Generating Zod schemas..."
npm run schema:generate-zod
echo "Zod schema generation completed successfully"

echo "Activity schema integration completed successfully!"

#!/bin/bash

# Manual Schema Integration Script
# This script performs a manual integration of the Activity schema into the main CKG schema

echo "==== Starting Manual Activity Schema Integration ===="

# Define paths
MAIN_SCHEMA_PATH="src/db/schema/schema.graphql"
ACTIVITY_SCHEMA_PATH="src/schema/activity-schema.graphql"
BACKUP_PATH="src/db/schema/schema.graphql.bak"

# Check if files exist
if [ ! -f "$MAIN_SCHEMA_PATH" ]; then
    echo "Error: Main schema file not found at $MAIN_SCHEMA_PATH"
    exit 1
fi

if [ ! -f "$ACTIVITY_SCHEMA_PATH" ]; then
    echo "Error: Activity schema file not found at $ACTIVITY_SCHEMA_PATH"
    exit 1
fi

# Create a backup of the main schema
echo "Creating backup of main schema..."
cp "$MAIN_SCHEMA_PATH" "$BACKUP_PATH"
echo "Backup created at $BACKUP_PATH"

# Check if activity schema is already integrated
if grep -q "type Activity implements Entity" "$MAIN_SCHEMA_PATH"; then
    echo "Activity schema is already integrated. No changes needed."
    exit 0
fi

# Append activity schema to main schema
echo "Appending activity schema to main schema..."
echo -e "\n\n# Activity Tracking Schema" >> "$MAIN_SCHEMA_PATH"
cat "$ACTIVITY_SCHEMA_PATH" >> "$MAIN_SCHEMA_PATH"
echo "Activity schema integrated successfully!"

echo "==== Manual Activity Schema Integration Complete ===="

# Option to run schema initialization
read -p "Do you want to run schema initialization? (y/n): " run_init
if [ "$run_init" = "y" ]; then
    echo "Running schema initialization..."
    npm run schema:init
    echo "Schema initialization complete!"
fi
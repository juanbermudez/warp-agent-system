#!/bin/bash

# CKG Activity Tracking Integration Script
# This script integrates the Activity schema into the CKG and tests the implementation

# Set the working directory to the project root
cd "$(dirname "$0")"

echo "=============================================="
echo "CKG Activity Tracking System Integration Tool"
echo "=============================================="
echo ""

# Function to check if the last command succeeded
check_status() {
  if [ $? -eq 0 ]; then
    echo "✓ $1"
    echo ""
  else
    echo "✗ $1"
    echo "Error occurred. Exiting."
    exit 1
  fi
}

# Step 1: Run the schema integration script
echo "Step 1: Integrating Activity schema into CKG schema..."
NODE_OPTIONS="--no-warnings" node dist/scripts/add-activity-schema.js
check_status "Schema integration"

# Step 2: Test CKG connection
echo "Step 2: Testing CKG connection..."
NODE_OPTIONS="--no-warnings" node dist/scripts/activity-cli-simple.js test-connection
check_status "CKG connection test"

# Step 3: Create test activity
echo "Step 3: Creating test activity..."
NODE_OPTIONS="--no-warnings" node dist/scripts/activity-cli-simple.js create-test-activity
check_status "Test activity creation"

# Step 4: Create test activity group
echo "Step 4: Creating test activity group..."
NODE_OPTIONS="--no-warnings" node dist/scripts/activity-cli-simple.js create-test-group
check_status "Test activity group creation"

# Step 5: Get recent activities
echo "Step 5: Fetching recent activities..."
NODE_OPTIONS="--no-warnings" node dist/scripts/activity-cli-simple.js get-recent-activities
check_status "Recent activities fetch"

# Ask if the user wants to run the migration script
echo "Do you want to run the migration script to migrate file-based activities to CKG? (y/n)"
read -r answer
if [[ "$answer" =~ ^[Yy]$ ]]; then
  echo "Step 6: Running migration script..."
  NODE_OPTIONS="--no-warnings" node dist/scripts/migrate-activities-to-ckg.js
  check_status "Activity migration"
fi

echo "=============================================="
echo "Integration process completed successfully!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Update agent implementations to use the CKG-based activity tracker"
echo "2. Implement comprehensive tests for the activity tracking system"
echo "3. Update documentation to reflect the CKG-based implementation"
echo ""

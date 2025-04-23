#!/bin/bash

# CKG Activity Tracking Test Script
# This script tests the fixed implementation of the CKG-based activity tracking system

# Set the working directory to the project root
cd "$(dirname "$0")"

echo "=========================================="
echo "CKG Activity Tracking System Test Script"
echo "=========================================="
echo ""

# Ensure we're using the compiled JavaScript files

# Test CKG connection
echo "Testing CKG connection..."
NODE_OPTIONS="--no-warnings" node dist/scripts/activity-cli-simple.js test-connection

echo ""
echo "Creating test activity..."
NODE_OPTIONS="--no-warnings" node dist/scripts/activity-cli-simple.js create-test-activity

echo ""
echo "Creating test activity group..."
NODE_OPTIONS="--no-warnings" node dist/scripts/activity-cli-simple.js create-test-group

echo ""
echo "Fetching recent activities..."
NODE_OPTIONS="--no-warnings" node dist/scripts/activity-cli-simple.js get-recent-activities

echo ""
echo "=========================================="
echo "Test complete!"
echo "=========================================="

#!/bin/bash

# Activity Tracker Integration Script
# This script performs all the necessary steps to integrate the Activity Tracker with the CKG

echo "==== Starting Activity Tracker Integration ===="

# Step 1: Add the activity schema to the main CKG schema
echo "Adding activity schema to main CKG schema..."
node --loader ts-node/esm src/scripts/add-activity-schema.ts

# Step 2: Initialize the schema in the database
echo "Initializing schema in the database..."
npm run schema:init

# Step 3: Generate Zod schemas for validation
echo "Generating Zod schemas..."
npm run schema:generate-zod

# Step 4: Run basic tests to verify functionality
echo "Running activity tracker tests..."
node --loader ts-node/esm src/tests/activity-ckg.test.ts

echo "==== Activity Tracker Integration Complete ===="

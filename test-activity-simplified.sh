#!/bin/bash

# Simplified Activity Tracking Test Script
# This script runs the simplified activity tracker test

echo "==== Running Simplified Activity Tracker Test ===="

# Run the test
node --loader ts-node/esm src/tests/activity-simplified-test.ts

echo "==== Simplified Activity Tracker Test Complete ===="
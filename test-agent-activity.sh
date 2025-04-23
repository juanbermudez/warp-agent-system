#!/bin/bash

# Agent Activity Integration Test Script
# This script runs the agent activity integration example

echo "==== Testing Agent Activity Integration ===="

# Run the agent activity example
node --loader ts-node/esm src/services/agent-activity-integration.ts

echo "==== Agent Activity Integration Test Complete ===="
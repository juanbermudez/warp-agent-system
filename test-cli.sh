#!/bin/bash

# Test script for activity tracking CLI

echo "=== Testing Activity Tracking CLI ==="

# Create a test task
echo -e "\n1. Creating a test task..."
TASK_ID=$(npm run --silent agent:task -- create --title "Test Task" --description "This is a test task" --type TEST | grep "Task created:" | awk '{print $3}')

if [ -z "$TASK_ID" ]; then
    echo "Failed to create task"
    exit 1
fi

echo "Created task: $TASK_ID"

# Add a comment
echo -e "\n2. Adding a comment..."
npm run --silent activity:comment -- --content "This is a test comment" --task-id $TASK_ID --actor-type USER --actor-id "test-user"

# Log a file change
echo -e "\n3. Logging a file change..."
npm run --silent activity:file -- --file src/index.ts --change-type MODIFIED --task-id $TASK_ID --actor-type USER --actor-id "test-user"

# Create an activity group
echo -e "\n4. Creating an activity group..."
GROUP_ID=$(npm run --silent activity:group -- create --title "Test Group" --task-id $TASK_ID | grep "Activity group created:" | awk '{print $4}')

if [ -z "$GROUP_ID" ]; then
    echo "Failed to create activity group"
    exit 1
fi

echo "Created activity group: $GROUP_ID"

# Log a command execution in the group
echo -e "\n5. Logging a command execution..."
npm run --silent activity:command -- --command "npm test" --output "Tests passed" --exit-code 0 --task-id $TASK_ID --group-id $GROUP_ID --actor-type USER --actor-id "test-user"

# List activities for the task
echo -e "\n6. Listing activities for the task..."
npm run --silent activity:list -- --task-id $TASK_ID --expanded

# Complete the activity group
echo -e "\n7. Completing the activity group..."
npm run --silent activity:group -- complete --id $GROUP_ID

echo -e "\n=== Testing completed successfully ==="

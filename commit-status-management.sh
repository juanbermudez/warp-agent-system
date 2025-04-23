#!/bin/bash

# Commit Task Status Management Enhancement

# Add new files
git add src/schema/status-management-schema.graphql
git add src/types/generated/status-management-schema.ts
git add src/services/status-management-service.ts
git add src/services/workflow-status-service.ts
git add src/agents/orchestrator-agent.ts
git add src/scripts/populate-status-entities.ts
git add src/tests/status-management-test.js
git add STATUS-MANAGEMENT-README.md

# Commit the changes
git commit -m "Add task status management enhancement with scope-aware configuration

This commit implements a flexible, scope-aware task status management system:

- Add TaskStatusEntity as first-class entity in the CKG
- Implement scope resolution for statuses (User > Project > Team > Org > Default)
- Connect workflows with status entities and transitions
- Enhance Orchestrator with status-aware task management
- Add utility scripts for populating status entities
- Create test script for validation

Resolves issue #XX: Implement status management with scope inheritance"

# Output message
echo "Changes committed successfully!"
echo "You can push these changes with: git push origin <branch-name>"

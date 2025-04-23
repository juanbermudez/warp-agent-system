# Activity Tracker Integration Guide

This document provides a comprehensive guide to the integration of the Activity Tracking System into the Warp Agent System using the Code Knowledge Graph (CKG).

## Overview

The Activity Tracker captures all meaningful events and interactions during the development process, providing a comprehensive timeline and audit trail. By integrating with the CKG, activities are stored alongside other entities like Tasks, Files, and Agents, enabling rich relationships and advanced querying capabilities.

## Integration Components

The integration consists of the following components:

1. **Schema Integration**
   - Activity schema added to the main CKG schema
   - Activity entity types defined with specialized subtypes
   - Relationships established to existing entity types

2. **Core Implementation**
   - `ActivityTrackerCKG` - The main service for logging and retrieving activities
   - `types-ckg.ts` - TypeScript types for CKG-based activities
   - `activity-cli-ckg.ts` - Command-line interface for interacting with activities

3. **Agent Integration**
   - `agent-activity-integration.ts` - Utilities for agents to log their activities
   - Agent-specific activity types and relationships

## Integration Steps

### 1. Schema Integration

The Activity schema has been merged into the main CKG schema. To apply this schema to the database:

```bash
# Run the integration script
./run-activity-integration.sh
```

This script:
- Adds the activity schema to the main schema
- Initializes the schema in the database
- Generates Zod schemas for validation
- Runs basic tests to verify functionality

### 2. Using the Activity Tracker in Agents

Agents can use the `AgentActivityLogger` class to log their activities:

```typescript
// Initialize the activity logger for an agent
const logger = new AgentActivityLogger('agent-123', 'Backend_Engineer', 'task-456');

// Start an activity group for a task
await logger.startActivityGroup('Implementing API Endpoint');

// Log a comment from the agent
await logger.logComment('I will need to create a new controller and update the route configuration.');

// Log a file change
await logger.logFileChange('/src/controllers/UserController.ts', 'CREATED', '+ export class UserController {...}');

// Log a command execution
await logger.logCommand('npm test', 'All tests passed', 0);

// Complete the activity group
await logger.completeActivityGroup();
```

### 3. Activity Types

The following specialized activity types are available:

- **Comment Activity**: For agent comments, questions, and answers
- **File Change Activity**: For tracking file creations, modifications, and deletions
- **Command Activity**: For tracking command executions
- **Agent Transition Activity**: For tracking role transitions

### 4. Querying Activities

Activities can be queried in various ways:

```typescript
// Get a task timeline
const activities = await activityTracker.getTaskTimeline('task-123');

// Get an activity thread (parent and replies)
const thread = await activityTracker.getActivityThread('activity-123');

// Get activities for a file
const fileActivities = await activityTracker.getFileActivities('/src/example.ts');

// Get time-based activities
const timeActivities = await activityTracker.getTimeBasedActivities({
  startTime: '2025-01-01T00:00:00Z',
  endTime: '2025-01-31T23:59:59Z'
});
```

## Testing

To test the integration:

```bash
# Run the activity tracker tests
./test-agent-activity.sh
```

## Benefits of CKG Integration

- **Unified Storage**: Activities stored alongside other entities
- **Rich Relationships**: Direct links between activities and related entities
- **Temporal Queries**: Time-based traversal of activities
- **Improved Querying**: Leverage CKG features for complex queries

## Known Issues and Limitations

- Schema initialization must be run after any schema changes
- Some import path issues may exist in older code referencing the activity tracker
- TimePoint integration requires the CKG's time-based traversal feature to be enabled

## Future Enhancements

- Migration utility for converting file-based activities to CKG
- Enhanced filtering and querying capabilities
- UI integration for displaying activity timelines
- Notification system based on activity events

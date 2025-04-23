# Activity Tracking System - CKG Implementation

## Overview

This document outlines the implementation of Warp's activity tracking system using the Code Knowledge Graph (CKG) as the storage backend. The system serves as the foundational layer for observability, collaboration, and auditing across the agent-based development workflow.

## Core Concepts

The activity tracking system captures all meaningful events within the Warp ecosystem, including:
- Agent interactions and role transitions
- File changes and code edits
- Command executions
- Task creation and status changes
- Comments and discussions

Activities support hierarchical organization, different view modes, threading for discussions, and time-based querying using the CKG's built-in TimePoint system.

## Architecture

### CKG Schema

The activity tracking system extends the CKG schema with new types:

1. **Activity**: Base entity for all activities
2. **ActivityGroup**: Groups related activities
3. **Specialized Activity Types**:
   - FileChangeActivity: For tracking file modifications
   - CommentActivity: For discussions and comments
   - CommandActivity: For command executions
   - AgentTransitionActivity: For agent role transitions

### Relationships

Activities are linked to other entities in the CKG:
- Activities ↔ Tasks
- Activities ↔ Files
- Activities ↔ Agents
- Activities ↔ Activity Groups
- Activities ↔ Parent/Child Activities (for threading)

### Time-Based Traversal

The CKG's TimePoint system is used to enable temporal queries:
- Each activity creates a TimePoint when logged
- Queries can filter by time windows
- Activities can be viewed chronologically

## Implementation

The CKG-based activity tracking system is implemented in the following files:

1. **Schema Definition**:
   - `/src/schema/activity-schema.graphql` - GraphQL schema for activities
   - `/src/services/activity/types-ckg.ts` - TypeScript types and interfaces

2. **Core Services**:
   - `/src/services/activity/activity-tracker-ckg.ts` - Main activity tracking service

3. **CLI Tools**:
   - `/src/scripts/activity-cli-ckg.ts` - Command-line interface for activities
   - `/src/scripts/migrate-activities-to-ckg.ts` - Migration tool for existing activities

## Key Features

1. **Unified Storage**
   - Activities stored in the CKG alongside other entities
   - Consistent access pattern with the rest of the CKG
   - Leverage existing CKG features (scope resolution, time-based traversal)

2. **Rich Relationships**
   - Direct links between activities and related entities
   - Strong type safety with specialized activity types
   - Support for threaded discussions and activity grouping

3. **Time-Based Queries**
   - Find activities within a time window
   - Track entity history using activities
   - Order activities chronologically

4. **CLI Interface**
   - Log various activity types
   - Retrieve activities with filtering
   - View activity threads and timelines

## Examples

### Logging Activities

```typescript
// Create an instance of the activity tracker
const activityTracker = new ActivityTrackerCKG();

// Log a comment
await activityTracker.logComment({
  content: "I think we should refactor this function",
  actorType: ActorType.USER,
  actorId: "user1",
  taskId: "task123"
});

// Log a file change
await activityTracker.logFileChange({
  filePath: "/src/utils/helpers.ts",
  changeType: "MODIFIED",
  actorType: ActorType.AGENT,
  actorId: "agent1",
  taskId: "task123",
  diffContent: "- const x = 1;\n+ const x = 2;"
});

// Log a command execution
await activityTracker.logCommand({
  command: "npm test",
  output: "All tests passed",
  exitCode: 0,
  actorType: ActorType.AGENT,
  actorId: "agent1",
  taskId: "task123"
});
```

### Querying Activities

```typescript
// Get task timeline
const activities = await activityTracker.getTaskTimeline("task123", {
  includeNested: true,
  filterTypes: [ActivityType.COMMENT, ActivityType.FILE_MODIFIED],
  startTime: "2023-01-01T00:00:00Z",
  endTime: "2023-01-31T23:59:59Z"
});

// Get file activities
const fileActivities = await activityTracker.getFileActivities("/src/utils/helpers.ts");

// Get activity thread
const thread = await activityTracker.getActivityThread("activity456");

// Get time-based activities
const timeActivities = await activityTracker.getTimeBasedActivities({
  startTime: "2023-01-01T00:00:00Z",
  endTime: "2023-01-31T23:59:59Z",
  activityTypes: [ActivityType.COMMAND_EXECUTED]
});
```

## Migrating from File-Based Storage

If you have existing activities in the file-based storage system, you can migrate them to the CKG using the migration script:

```bash
# From the project root
npm run migrate-activities
```

Or programmatically:

```typescript
import { migrateActivities } from './scripts/migrate-activities-to-ckg';

await migrateActivities('/path/to/project');
```

## Integration Points

The CKG-based activity tracking system integrates with the following components:

1. **Agent System**
   - Agents can log activities via the ActivityTrackerCKG
   - Agent transitions are tracked

2. **CKG / Memory Bank**
   - Activities are first-class entities in the CKG
   - Activities have relationships with other entities

3. **Task Management**
   - Tasks have timeline views of related activities
   - Activity groups can span multiple tasks

## Future Enhancements

1. **Advanced Querying**
   - Query by participant (who was involved in an activity)
   - Query by relevance to specific code paths

2. **Analytics**
   - Measure agent productivity
   - Analyze task completion patterns

3. **UI Integration**
   - Timeline visualization
   - Thread-based collaboration UI
   - Real-time activity feed

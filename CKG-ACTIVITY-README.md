# CKG Activity Tracking System

This document provides a comprehensive guide to the CKG-based Activity Tracking System implemented in the Warp project.

## Overview

The Activity Tracking System is a core component of the Warp agent architecture, providing observability, history, and contextual awareness across the entire development lifecycle. The system has been refactored to use the Code Knowledge Graph (CKG) instead of file-based storage, aligning with the project's overall architecture and enabling richer relationships and queries.

## Key Features

- **First-Class CKG Entities**: Activities are now first-class entities in the CKG
- **Specialized Activity Types**: Support for FileChange, Comment, Command, and AgentTransition activities
- **Threaded Discussions**: Parent-child relationships for activities
- **Activity Groups**: Logical grouping of related activities
- **Temporal Tracking**: Integration with the TimePoint system for time-based queries
- **Entity Relationships**: Direct relationships to tasks, files, agents, and other entities

## Implementation

The implementation consists of the following components:

### Schema

- `/src/schema/activity-schema.graphql`: GraphQL schema for activities
- Defines Activity interface and specialized activity types
- Includes relationships to other entity types

### Types

- `/src/services/activity/types-ckg.ts`: TypeScript types for activities
- Provides type-safe interfaces for working with activities
- Includes Zod schemas for validation

### Core Implementation

- `/src/services/activity/activity-tracker-ckg.ts`: Main service
- Implements the activity tracking API
- Handles CKG interactions via query_ckg and update_ckg

### Scripts and Tools

- `/src/scripts/activity-cli-ckg.ts`: CLI for activity management
- `/src/scripts/add-activity-schema.ts`: Integrates activity schema with CKG schema
- `/src/scripts/migrate-activities-to-ckg.ts`: Migrates file-based activities to CKG
- `/src/scripts/activity-cli-simple.ts`: Simple test script

## Integration

To integrate the CKG Activity Tracking System:

1. Run the schema integration script:
   ```bash
   ./integrate-activity-ckg.sh
   ```

   This script will:
   - Integrate the activity schema into the CKG
   - Initialize the schema in the database
   - Generate required Zod schemas
   - Test the implementation

2. If you only want to test the fixed implementation without integration:
   ```bash
   ./test-activity-ckg.sh
   ```

## Usage Examples

```typescript
// Import the activity tracker
import { ActivityTrackerCKG } from '../services/activity/activity-tracker-ckg.js';
import { ActorType, ActivityType, RenderMode } from '../services/activity/types-ckg.js';

// Create an instance
const activityTracker = new ActivityTrackerCKG();

// Log a comment
await activityTracker.logComment({
  content: 'This is a comment',
  actorType: ActorType.USER,
  actorId: 'user123',
  taskId: 'task123',
  renderMode: RenderMode.ALWAYS_EXPANDED,
  activityType: ActivityType.COMMENT,
  nestingLevel: 0,
  hasAttachments: false
});

// Log a file change
await activityTracker.logFileChange({
  filePath: '/path/to/file.js',
  changeType: 'MODIFIED',
  actorType: ActorType.AGENT,
  actorId: 'agent123',
  taskId: 'task123',
  diffContent: '+ console.log("New log")'
});

// Create an activity group
const group = await activityTracker.createActivityGroup({
  title: 'Deploy Process',
  description: 'Activities related to the deployment process',
  taskId: 'task123'
});

// Get task timeline
const activities = await activityTracker.getTaskTimeline('task123', {
  includeNested: true,
  filterTypes: [ActivityType.COMMENT, ActivityType.FILE_MODIFIED],
  limit: 20
});
```

## Migration

To migrate existing file-based activities to the CKG:

1. Run the integration script with the migration option:
   ```bash
   ./integrate-activity-ckg.sh
   # Select 'y' when prompted to run the migration
   ```

2. Or run the migration script directly:
   ```bash
   node src/scripts/migrate-activities-to-ckg.ts
   ```

## Agent Integration

To update agents to use the CKG-based activity tracking:

1. Update imports:
   ```typescript
   // Change from
   import { ActivityTracker } from '../services/activity/activity-tracker.js';
   
   // To
   import { ActivityTrackerCKG } from '../services/activity/activity-tracker-ckg.js';
   ```

2. Update instantiation:
   ```typescript
   // Change from
   const activityTracker = new ActivityTracker();
   
   // To
   const activityTracker = new ActivityTrackerCKG();
   ```

The API is compatible between implementations, so no other changes should be necessary.

## Testing

Run the test script to verify the implementation:

```bash
./test-activity-ckg.sh
```

## Troubleshooting

If you encounter issues:

1. Check if the CKG schema is properly integrated
2. Verify the CKG database is running and accessible
3. Check TypeScript compilation errors
4. Look for import path issues

## Architecture Benefits

The CKG-based implementation offers several advantages:

1. **Graph-Based Relationships**: Direct relationships between activities and other entities
2. **Time-Based Queries**: Integration with the TimePoint system for temporal queries
3. **Scoped Inheritance**: Activities benefit from the CKG's scope resolution
4. **Unified Model**: Activities are part of the same unified knowledge model as other entities
5. **Enhanced Queries**: Support for complex graph queries not possible with file-based storage

## Contributors

This implementation was created as part of the Warp agent architecture development.

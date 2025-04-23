# Activity Tracking CKG Integration

This document summarizes the work done to migrate the Activity Tracking System from file-based storage to use the Code Knowledge Graph (CKG).

## Files Created

1. **Schema Definitions**:
   - `/src/schema/activity-schema.graphql` - GraphQL schema extension for activities
   - `/src/services/activity/types-ckg.ts` - TypeScript types for CKG-based activities

2. **Core Components**:
   - `/src/services/activity/activity-tracker-ckg.ts` - CKG-based activity tracking service
   - `/src/services/activity/ACTIVITY-TRACKING-CKG-README.md` - Documentation for the CKG implementation

3. **Utilities**:
   - `/src/scripts/activity-cli-ckg.ts` - CLI for the CKG-based activity tracking
   - `/src/scripts/migrate-activities-to-ckg.ts` - Migration tool for existing activities
   - `/src/scripts/add-activity-schema.ts` - Script to add activity schema to the CKG schema
   - `/src/scripts/activity-cli-simple.ts` - Simplified test script

4. **Updated Files**:
   - `package.json` - Added new scripts for CKG activity tracking

## Integration Status

The integration is **partially complete** but requires additional work to be fully functional:

1. **Schema Integration**:
   - The activity schema needs to be successfully added to the main CKG schema
   - There appear to be some issues with exporting/importing from the dgraph.js module

2. **Type Issues**:
   - There are TypeScript errors that need to be resolved in the activity-tracker-ckg.ts file
   - The import paths and function names need to be aligned with project conventions

3. **Migration Tests**:
   - The migration script needs to be tested with existing activities

## Next Steps

To complete the integration, the following steps are recommended:

1. **Fix Schema Integration**:
   ```bash
   # Manually add the activity schema to the main schema
   cat src/schema/activity-schema.graphql >> src/db/schema/schema.graphql
   
   # Initialize the schema
   npm run schema:init
   ```

2. **Fix Type Issues**:
   - Update imports in `activity-tracker-ckg.ts` to match project conventions
   - Add proper type casts for specialized activity types

3. **Test Migration**:
   - Once schema is integrated, test the migration script
   ```bash
   npm run activity:migrate
   ```

4. **Update CLI**:
   - Fix imports in `activity-cli-ckg.ts`
   - Test the CLI with basic activity operations

## Benefits of CKG Integration

Once complete, the CKG-based activity tracking will provide:

1. **Unified Storage**: Activities stored alongside other entities in the CKG
2. **Rich Relationships**: Direct links between activities and related entities
3. **Temporal Queries**: Time-based traversal of activities
4. **Improved Querying**: Leverage CKG features for complex queries

## Example Usage (After Integration)

```typescript
// Create an activity tracker
const activityTracker = new ActivityTrackerCKG();

// Log a comment
await activityTracker.logComment({
  content: "This looks good to me",
  actorType: ActorType.USER,
  actorId: "user1",
  taskId: "task123"
});

// Get task timeline
const activities = await activityTracker.getTaskTimeline("task123");
```

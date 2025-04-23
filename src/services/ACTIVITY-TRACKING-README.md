# Activity Tracking System Implementation Plan

## Overview

This document outlines the implementation plan for Warp's comprehensive activity tracking system. This system serves as the foundational layer for observability, collaboration, and auditing across the agent-based development workflow.

## Core Concepts

The activity tracking system captures all meaningful events within the Warp ecosystem, including:
- Agent interactions and role transitions
- File changes and code edits
- Command executions
- Task creation and status changes
- Comments and discussions
- Integration events (future: GitHub, CI/CD)

Activities support hierarchical organization, different view modes, and threading for discussions.

## Implementation Plan

### Phase 1: Core Schema & Storage (Days 1-2)

1. **Define Base Schemas**
   - Create activity and activity group type definitions
   - Define specialized activity types (FileChange, Comment, Command, AgentTransition)
   - Implement render modes and nesting structure

2. **Create Storage Service**
   - Implement file-based storage in `.warp_memory/activities`
   - Create index structures for efficient querying
   - Build CRUD operations for activities and activity groups

### Phase 2: Activity Tracking Service (Days 3-4)

1. **Implement Core Tracking Service**
   - Build the main ActivityTracker class
   - Implement specialized logging methods for different activity types
   - Create timeline generation with filtering options
   - Add thread management capabilities

### Phase 3: CLI Interface (Day 5)

1. **Create Command-Line Tool**
   - Implement commands for all major operations
   - Add formatted output for different activity types
   - Create help documentation and examples

### Phase 4: Agent System Integration (Days 6-7)

1. **Extend Agent System**
   - Add activity tracking to the existing agent system
   - Modify transition methods to log activity
   - Hook into file operations and command executions
   - Provide timeline viewing capabilities

## Directory Structure

```
src/
  services/
    activity/
      types.ts             # Schema definitions
      storage.ts           # Persistence layer
      activity-tracker.ts  # Main tracking service
      index.ts             # Module exports
  scripts/
    activity-cli.ts        # CLI interface
```

## Features to Implement

1. **Activity Schema**
   - Base Activity interface
   - ActivityType and ActorType enums
   - RenderMode options for UI flexibility
   - ActivityGroup for logical organization

2. **Storage System**
   - JSON file-based storage
   - Task and entity indexes
   - Timeline retrieval with sorting

3. **Activity Types**
   - CommentActivity
   - FileChangeActivity
   - CommandActivity
   - AgentTransitionActivity

4. **Timeline & Threading**
   - Filtering options
   - Parent-child relationships
   - Activity grouping

5. **CLI Commands**
   - Log various activity types
   - Manage activity groups
   - List activities with filtering
   - View activity threads

## Integration Points

The activity tracking system will integrate with the following components:

1. **Agent System**
   - Log agent role transitions
   - Track commands executed by agents
   - Record file modifications

2. **CKG / Memory Bank**
   - Store activities in the `.warp_memory` directory
   - Link activities to tasks and other entities

3. **HITL Interactions**
   - Record human-in-the-loop interventions
   - Support discussion threads on review points

## Success Criteria

The implementation will be considered successful when:

1. All agent actions are automatically tracked
2. File changes are recorded with diffs
3. Commands are logged with their output
4. Activities can be queried by task or entity
5. Threaded discussions are supported
6. Activity groups provide logical organization
7. CLI tool provides comprehensive management

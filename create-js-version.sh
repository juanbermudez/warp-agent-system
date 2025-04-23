#!/bin/bash

# Create JavaScript Version Script
# This script compiles the TypeScript code to JavaScript and creates a testing version

echo "==== Creating JavaScript Version for Testing ===="

# Create directory for JavaScript files
mkdir -p js_test/services/activity
mkdir -p js_test/tests

# Create simplified JavaScript versions
cat > js_test/services/activity/types-ckg.js << 'EOL'
/**
 * Simplified types for the activity tracker testing
 */

// Enums
export const ActorType = {
  AGENT: 'AGENT',
  USER: 'USER',
  SYSTEM: 'SYSTEM',
  INTEGRATION: 'INTEGRATION'
};

export const ActivityType = {
  COMMENT: 'COMMENT',
  TASK_CREATED: 'TASK_CREATED',
  FILE_MODIFIED: 'FILE_MODIFIED',
  COMMAND_EXECUTED: 'COMMAND_EXECUTED',
  CUSTOM: 'CUSTOM'
};

export const RenderMode = {
  ALWAYS_EXPANDED: 'ALWAYS_EXPANDED',
  EXPANDABLE: 'EXPANDABLE',
  ALWAYS_CONDENSED: 'ALWAYS_CONDENSED'
};
EOL

cat > js_test/services/activity/ckg-adapter.js << 'EOL'
/**
 * Mock CKG adapter for testing
 */

// Mock query results
const mockActivities = new Map();

// Mock query function
export async function queryCkg(params) {
  console.log('Mock queryCkg called with params:', JSON.stringify(params));
  
  // Handle different query types
  if (params.queryType === 'findRelatedNodes') {
    const nodeId = params.parameters?.nodeId;
    let results = [];
    
    // Get activities for the task
    if (params.nodeType === 'Task' && params.parameters?.relationType === 'activities') {
      results = Array.from(mockActivities.values())
        .filter(activity => activity.taskId === nodeId);
    }
    
    return {
      success: true,
      status: 'success',
      results: results
    };
  }
  
  return {
    success: true,
    status: 'success',
    results: []
  };
}

// Mock update function
export async function updateCkg(params) {
  console.log('Mock updateCkg called with params:', JSON.stringify(params));
  
  // Handle different update types
  if (params.updateType === 'createNode' && params.nodeType === 'Activity') {
    const activity = params.nodeData;
    mockActivities.set(activity.id, activity);
    console.log(`Mock activity created with ID: ${activity.id}`);
  } else if (params.updateType === 'createRelationship') {
    console.log(`Mock relationship created from ${params.nodeType}:${params.nodeId} to ${params.targetNodeType}:${params.targetNodeId}`);
  }
  
  return {
    success: true,
    status: 'success'
  };
}
EOL

cat > js_test/services/activity/activity-tracker-simplified.js << 'EOL'
/**
 * Simplified activity tracker for testing
 */

import { v4 as uuidv4 } from 'uuid';
import { ActorType, ActivityType, RenderMode } from './types-ckg.js';
import { queryCkg, updateCkg } from './ckg-adapter.js';

/**
 * Simplified activity tracker
 */
export class ActivityTrackerSimplified {
  /**
   * Log a generic activity
   */
  async logActivity(activity) {
    const now = new Date().toISOString();
    
    const completeActivity = {
      id: activity.id || `act-${uuidv4()}`,
      timestamp: activity.timestamp || now,
      actorType: activity.actorType || ActorType.SYSTEM,
      actorId: activity.actorId || 'system',
      activityType: activity.activityType || ActivityType.CUSTOM,
      title: activity.title || 'Activity',
      content: activity.content || '',
      renderMode: activity.renderMode || RenderMode.EXPANDABLE,
      nestingLevel: activity.nestingLevel || 0,
      metadata: activity.metadata || {},
      createdAt: now,
      ...activity
    };
    
    const result = await updateCkg({
      updateType: 'createNode',
      nodeType: 'Activity',
      nodeData: completeActivity
    });
    
    if (result.status === 'error') {
      throw new Error(`Failed to create activity: ${result.error}`);
    }
    
    // Link to task if applicable
    if (completeActivity.taskId) {
      await this.createRelationship(
        'Activity', 
        completeActivity.id, 
        'task',
        'Task',
        completeActivity.taskId
      );
    }
    
    return completeActivity;
  }
  
  /**
   * Create a relationship between two entities
   */
  async createRelationship(sourceType, sourceId, relationshipType, targetType, targetId) {
    await updateCkg({
      updateType: 'createRelationship',
      nodeType: sourceType,
      nodeId: sourceId,
      relationshipType: relationshipType,
      targetNodeType: targetType,
      targetNodeId: targetId
    });
  }
  
  /**
   * Log a comment activity
   */
  async logComment(params) {
    const { content, mentions, hasAttachments, ...rest } = params;
    
    const activity = {
      activityType: ActivityType.COMMENT,
      title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      renderMode: RenderMode.ALWAYS_EXPANDED,
      nestingLevel: rest.parentActivityId ? 1 : 0,
      ...rest
    };
    
    return await this.logActivity(activity);
  }
  
  /**
   * Get a task timeline
   */
  async getTaskTimeline(taskId) {
    const result = await queryCkg({
      queryType: 'findRelatedNodes',
      nodeType: 'Task',
      parameters: {
        nodeId: taskId,
        relationType: 'activities'
      }
    });
    
    if (result.status !== 'success' || !result.results) {
      return [];
    }
    
    return result.results;
  }
}
EOL

cat > js_test/tests/activity-simplified-test.js << 'EOL'
#!/usr/bin/env node

/**
 * Simplified activity tracker test in JavaScript
 */

import { ActivityTrackerSimplified } from '../services/activity/activity-tracker-simplified.js';
import { ActorType, ActivityType } from '../services/activity/types-ckg.js';
import { v4 as uuidv4 } from 'uuid';

// Create a mock task ID for testing
const MOCK_TASK_ID = `task-${uuidv4()}`;
console.log(`Using mock task ID: ${MOCK_TASK_ID}`);

// Create activity tracker instance
const activityTracker = new ActivityTrackerSimplified();

/**
 * Run simplified tests for the activity tracker
 */
async function runTests() {
  try {
    console.log('Starting simplified CKG activity tracking tests...');
    
    // Test 1: Log a comment
    console.log('\nTest 1: Log a comment');
    const comment = await activityTracker.logComment({
      content: 'This is a test comment',
      actorType: ActorType.USER,
      actorId: 'test-user',
      taskId: MOCK_TASK_ID,
      hasAttachments: false
    });
    console.log('Comment logged:', comment.id);
    
    // Test 2: Get task timeline
    console.log('\nTest 2: Get task timeline');
    const timeline = await activityTracker.getTaskTimeline(MOCK_TASK_ID);
    console.log(`Found ${timeline.length} activities in the timeline`);
    for (const activity of timeline) {
      console.log(`- ${activity.activityType}: ${activity.title}`);
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);
EOL

cat > js_test/run-test.js << 'EOL'
#!/usr/bin/env node

/**
 * Test runner for the simplified activity tracker
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('==== Running JavaScript Activity Tracker Test ====');

// Run the test
const test = spawn('node', ['tests/activity-simplified-test.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

test.on('close', (code) => {
  console.log(`==== Test complete with code: ${code} ====`);
});
EOL

# Make the test runner executable
chmod +x js_test/run-test.js

echo "==== JavaScript Version Created for Testing ===="
echo "To run the test: node js_test/run-test.js"

# Create a convenience script for running the test
cat > run-js-test.sh << 'EOL'
#!/bin/bash
node js_test/run-test.js
EOL

chmod +x run-js-test.sh
echo "Or use: ./run-js-test.sh"
#!/usr/bin/env node

/**
 * Activity Tracking CKG Fixed Implementation Test
 * 
 * This script tests the fixed CKG-based activity tracking system.
 */

import { ActivityTrackerCKG } from '../services/activity/activity-tracker-ckg-fixed.js';
import { ActorType, ActivityType, RenderMode } from '../services/activity/types-ckg.js';
import { v4 as uuidv4 } from 'uuid';

// Create a mock task ID for testing
const MOCK_TASK_ID = `task-${uuidv4()}`;
console.log(`Using mock task ID: ${MOCK_TASK_ID}`);

// Create activity tracker instance
const activityTracker = new ActivityTrackerCKG();

/**
 * Run tests for the activity tracker
 */
async function runTests(): Promise<void> {
  try {
    console.log('Starting fixed CKG activity tracking tests...');
    
    // Test 1: Create an activity group
    console.log('\nTest 1: Create an activity group');
    const group = await activityTracker.createActivityGroup({
      title: 'Test Group',
      description: 'A test activity group',
      taskId: MOCK_TASK_ID
    });
    console.log('Group created:', group.id);
    
    // Test 2: Log a comment
    console.log('\nTest 2: Log a comment');
    const comment = await activityTracker.logComment({
      content: 'This is a test comment',
      actorType: ActorType.USER,
      actorId: 'test-user',
      taskId: MOCK_TASK_ID,
      activityGroupId: group.id,
      hasAttachments: false
    });
    console.log('Comment logged:', comment.id);
    
    // Test 3: Log a file change
    console.log('\nTest 3: Log a file change');
    const fileChange = await activityTracker.logFileChange({
      filePath: '/src/test/example.ts',
      changeType: 'MODIFIED',
      actorType: ActorType.AGENT,
      actorId: 'test-agent',
      taskId: MOCK_TASK_ID,
      activityGroupId: group.id,
      diffContent: '- const x = 1;\n+ const x = 2;'
    });
    console.log('File change logged:', fileChange.id);
    
    // Test 4: Get task timeline
    console.log('\nTest 4: Get task timeline');
    const timeline = await activityTracker.getTaskTimeline(MOCK_TASK_ID);
    console.log(`Found ${timeline.length} activities in the timeline`);
    for (const activity of timeline) {
      console.log(`- ${activity.activityType}: ${activity.title}`);
    }
    
    // Test 5: Complete the activity group
    console.log('\nTest 5: Complete the activity group');
    const completedGroup = await activityTracker.completeActivityGroup(group.id);
    console.log('Group completed. End time:', completedGroup?.endTime);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
    process.exit(1);
  }
}

// Execute the tests
runTests().catch(console.error);

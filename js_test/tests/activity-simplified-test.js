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

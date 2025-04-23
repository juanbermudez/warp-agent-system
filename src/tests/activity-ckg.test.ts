#!/usr/bin/env node

/**
 * Activity Tracking CKG Tests
 * 
 * This script tests the CKG-based activity tracking system.
 */

import { ActivityTrackerCKG } from '../services/activity/activity-tracker-ckg';
import { ActorType, ActivityType, RenderMode } from '../services/activity/types-ckg';
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
    console.log('Starting CKG activity tracking tests...');
    
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
    
    // Test 4: Log a command
    console.log('\nTest 4: Log a command');
    const command = await activityTracker.logCommand({
      command: 'npm test',
      output: 'All tests passed',
      exitCode: 0,
      actorType: ActorType.AGENT,
      actorId: 'test-agent',
      taskId: MOCK_TASK_ID,
      activityGroupId: group.id
    });
    console.log('Command logged:', command.id);
    
    // Test 5: Log a threaded comment (reply)
    console.log('\nTest 5: Log a threaded comment (reply)');
    const reply = await activityTracker.logComment({
      content: 'This is a reply to the original comment',
      actorType: ActorType.USER,
      actorId: 'test-user-2',
      taskId: MOCK_TASK_ID,
      parentActivityId: comment.id,
      hasAttachments: false
    });
    console.log('Reply logged:', reply.id);
    
    // Test 6: Get task timeline
    console.log('\nTest 6: Get task timeline');
    const timeline = await activityTracker.getTaskTimeline(MOCK_TASK_ID);
    console.log(`Found ${timeline.length} activities in the timeline`);
    for (const activity of timeline) {
      console.log(`- ${activity.activityType}: ${activity.title}`);
    }
    
    // Test 7: Get activity thread
    console.log('\nTest 7: Get activity thread');
    const thread = await activityTracker.getActivityThread(comment.id);
    console.log(`Found ${thread.length} activities in the thread`);
    for (const activity of thread) {
      console.log(`- ${activity.activityType}: ${activity.title}`);
    }
    
    // Test 8: Get file activities
    console.log('\nTest 8: Get file activities');
    const fileActivities = await activityTracker.getFileActivities('/src/test/example.ts');
    console.log(`Found ${fileActivities.length} activities for the file`);
    for (const activity of fileActivities) {
      console.log(`- ${activity.activityType}: ${activity.title}`);
    }
    
    // Test 9: Complete the activity group
    console.log('\nTest 9: Complete the activity group');
    const completedGroup = await activityTracker.completeActivityGroup(group.id);
    console.log('Group completed. End time:', completedGroup?.endTime);
    
    // Test 10: Get time-based activities
    console.log('\nTest 10: Get time-based activities');
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - 1); // 1 hour ago
    const endTime = new Date();
    const timeActivities = await activityTracker.getTimeBasedActivities({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });
    console.log(`Found ${timeActivities.length} activities in the time range`);
    for (const activity of timeActivities) {
      console.log(`- ${activity.activityType}: ${activity.title}`);
    }
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error during tests:', error);
    process.exit(1);
  }
}

// Execute if this script is run directly
if (require.main === module) {
  runTests().catch(console.error);
}

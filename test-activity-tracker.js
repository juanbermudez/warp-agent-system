// Test ActivityTrackerCKG Integration
// This script tests if the ActivityTrackerCKG class works correctly

import { ActivityTrackerCKG } from './dist/services/activity/activity-tracker-ckg.js';
import { ActorType } from './dist/services/activity/types-ckg.js';

async function testActivityTracker() {
  console.log('==== Testing ActivityTrackerCKG ====');
  
  try {
    // Create activity tracker instance
    console.log('Creating ActivityTrackerCKG instance...');
    const activityTracker = new ActivityTrackerCKG();
    
    // Test comment logging
    console.log('Testing logComment...');
    const comment = await activityTracker.logComment({
      content: 'This is a test comment',
      actorType: ActorType.USER,
      actorId: 'test-user',
      hasAttachments: false
    });
    
    console.log('✅ Successfully created comment activity!');
    console.log('Comment ID:', comment.id);
    
    // Test file change logging
    console.log('Testing logFileChange...');
    const fileChange = await activityTracker.logFileChange({
      filePath: '/test/path/file.txt',
      changeType: 'MODIFIED',
      actorType: ActorType.USER,
      actorId: 'test-user',
      diffContent: '- Old line\n+ New line'
    });
    
    console.log('✅ Successfully created file change activity!');
    console.log('File change ID:', fileChange.id);
    
    // Test activity group creation
    console.log('Testing createActivityGroup...');
    const group = await activityTracker.createActivityGroup({
      title: 'Test Activity Group',
      description: 'A test activity group'
    });
    
    console.log('✅ Successfully created activity group!');
    console.log('Group ID:', group.id);
    
    // Test commenting in the activity group
    console.log('Testing comment in activity group...');
    const groupComment = await activityTracker.logComment({
      content: 'This is a test comment in a group',
      actorType: ActorType.USER,
      actorId: 'test-user',
      activityGroupId: group.id,
      hasAttachments: false
    });
    
    console.log('✅ Successfully created comment in activity group!');
    console.log('Group comment ID:', groupComment.id);
    
    // Test time-based activities
    console.log('Testing getTimeBasedActivities...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const activities = await activityTracker.getTimeBasedActivities({
      startTime: yesterday.toISOString(),
      endTime: new Date().toISOString(),
      limit: 10
    });
    
    console.log(`Found ${activities.length} recent activities`);
    
    // Test completing a group
    console.log('Testing completeActivityGroup...');
    const completedGroup = await activityTracker.completeActivityGroup(group.id);
    
    console.log('✅ Successfully completed activity group!');
    console.log('Group end time:', completedGroup.endTime);
    
    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  console.log('==== Test Complete ====');
}

testActivityTracker();

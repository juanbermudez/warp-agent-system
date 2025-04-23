#!/usr/bin/env node

/**
 * Simple CLI for testing Activity Tracking
 */

import { program } from 'commander';
import { updateCkg } from '../tools/update_ckg.js';
import { queryCkg } from '../tools/query_ckg.js';
import { ActivityTrackerCKG } from '../services/activity/activity-tracker-ckg.js';
import { ActivityType, ActorType, RenderMode } from '../services/activity/types-ckg.js';
import { v4 as uuidv4 } from 'uuid';

// Setup CLI program
program
  .name('warp-activity-simple')
  .description('Warp Activity Tracking Test CLI')
  .version('1.0.0');

// Test connections to CKG
program
  .command('test-connection')
  .description('Test connection to the CKG')
  .action(async () => {
    try {
      console.log('Testing connection to CKG...');
      
      // Try a simple query
      const queryResult = await queryCkg({
        queryType: 'findNodesByLabel',
        nodeType: 'Task',
        parameters: {
          limit: 1
        }
      });
      
      console.log('Query result:', queryResult.status === 'success' ? 'SUCCESS' : 'FAILED');
      
      // Try a simple update
      const testId = `test-${uuidv4()}`;
      const updateResult = await updateCkg({
        updateType: 'createNode',
        nodeType: 'Task',
        nodeData: {
          id: testId,
          title: 'Test Task',
          description: 'A test task for CKG connection',
          taskLevel: 'TASK',
          status: 'TODO'
        }
      });
      
      console.log('Update result:', updateResult.status === 'success' ? 'SUCCESS' : 'FAILED');
      console.log('Test complete!');
    } catch (error) {
      console.error('Error testing CKG connection:', error);
      process.exit(1);
    }
  });

// Create a test activity using ActivityTrackerCKG
program
  .command('create-test-activity')
  .description('Create a test activity using ActivityTrackerCKG')
  .action(async () => {
    try {
      console.log('Creating test activity using ActivityTrackerCKG...');
      
      // Create activity tracker instance
      const activityTracker = new ActivityTrackerCKG();
      
      // Create a simple comment activity
      try {
        const activity = await activityTracker.logComment({
          content: 'This is a test comment activity',
          actorType: ActorType.USER,
          actorId: 'test-user',
          renderMode: RenderMode.ALWAYS_EXPANDED,
          nestingLevel: 0,
          hasAttachments: false
        });
        
        console.log('Test activity created successfully!');
        console.log('Activity ID:', activity.id);
        console.log('Activity details:', JSON.stringify(activity, null, 2));
      } catch (err) {
        console.error('Error creating activity with ActivityTrackerCKG:', err instanceof Error ? err.message : String(err));
        
        // Fallback to creating a test task if activity schema is not integrated
        console.log('Falling back to creating a task as stand-in for activity');
        const activityId = `act-${uuidv4()}`;
        const now = new Date().toISOString();
        
        const activity = {
          id: activityId,
          timestamp: now,
          actorType: 'USER',
          actorId: 'test-user',
          activityType: 'COMMENT',
          title: 'Test Activity',
          content: 'This is a test activity',
          renderMode: 'ALWAYS_EXPANDED',
          nestingLevel: 0,
          createdAt: now
        };
        
        // Create a task with activity data as metadata
        const result = await updateCkg({
          updateType: 'createNode',
          nodeType: 'Task',
          nodeData: {
            id: activityId,
            title: 'Test Activity',
            description: 'This is a test activity',
            taskLevel: 'TASK',
            status: 'TODO',
            metadata: JSON.stringify(activity)
          }
        });
        
        if (result.status === 'success') {
          console.log('Fallback test task created successfully!');
          console.log('Activity ID:', activityId);
        } else {
          console.error('Failed to create fallback test task:', result.error);
        }
      }
    } catch (error) {
      console.error('Error in create-test-activity command:', error);
      process.exit(1);
    }
  });

// Create a test activity group
program
  .command('create-test-group')
  .description('Create a test activity group')
  .action(async () => {
    try {
      console.log('Creating test activity group...');
      
      // Create activity tracker instance
      const activityTracker = new ActivityTrackerCKG();
      
      try {
        // Create an activity group
        const group = await activityTracker.createActivityGroup({
          title: 'Test Activity Group',
          description: 'A test activity group for testing purposes'
        });
        
        console.log('Test activity group created successfully!');
        console.log('Group ID:', group.id);
        console.log('Group details:', JSON.stringify(group, null, 2));
        
        // Create an activity in the group
        const activity = await activityTracker.logComment({
          content: 'This is a test comment in a group',
          actorType: ActorType.USER,
          actorId: 'test-user',
          activityGroupId: group.id,
          renderMode: RenderMode.ALWAYS_EXPANDED,
          nestingLevel: 0,
          hasAttachments: false
        });
        
        console.log('Test activity in group created successfully!');
        console.log('Activity ID:', activity.id);
      } catch (err) {
        console.error('Error creating group with ActivityTrackerCKG:', err instanceof Error ? err.message : String(err));
      }
    } catch (error) {
      console.error('Error in create-test-group command:', error);
      process.exit(1);
    }
  });

// Get recent activities
program
  .command('get-recent-activities')
  .description('Get recent activities')
  .action(async () => {
    try {
      console.log('Fetching recent activities...');
      
      // Create activity tracker instance
      const activityTracker = new ActivityTrackerCKG();
      
      try {
        // Get activities from the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const activities = await activityTracker.getTimeBasedActivities({
          startTime: yesterday.toISOString(),
          endTime: new Date().toISOString(),
          limit: 10
        });
        
        console.log(`Found ${activities.length} recent activities`);
        
        if (activities.length > 0) {
          console.log('Activities:', JSON.stringify(activities, null, 2));
        }
      } catch (err) {
        console.error('Error fetching activities with ActivityTrackerCKG:', err instanceof Error ? err.message : String(err));
      }
    } catch (error) {
      console.error('Error in get-recent-activities command:', error);
      process.exit(1);
    }
  });

// Parse arguments and execute
program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.help();
}

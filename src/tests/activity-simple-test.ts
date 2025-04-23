/**
 * Simple Activity Tracking Test
 */

import path from 'path';
import { ActivityTracker, ActorType, ActivityType } from '../services/activity';

// Get project root path
const ROOT_PATH = path.resolve(process.cwd());

console.log('Starting simple activity tracking test...');

// Main test function
async function runTest() {
  try {
    console.log('Creating ActivityTracker instance...');
    const activityTracker = new ActivityTracker(ROOT_PATH);
    
    // Create a test activity
    console.log('Creating test activity...');
    const activity = await activityTracker.logActivity({
      activityType: ActivityType.CUSTOM,
      title: 'Test Activity',
      content: 'This is a test activity',
      actorType: ActorType.USER,
      actorId: 'test-user'
    });
    
    console.log(`Created activity: ${activity.id}`);
    console.log(JSON.stringify(activity, null, 2));
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run test
runTest();

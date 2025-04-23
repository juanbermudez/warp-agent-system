/**
 * Test for the activity tracking system
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Get project root path
const ROOT_PATH = process.cwd();

// Path to .warp_memory directory
const MEMORY_PATH = path.join(ROOT_PATH, '.warp_memory');

// Generate test activity
const testActivity = {
  id: `test-act-${uuidv4()}`,
  timestamp: new Date().toISOString(),
  actorType: 'USER',
  actorId: 'test-user',
  activityType: 'CUSTOM',
  title: 'Test Activity',
  content: 'This is a test activity',
  renderMode: 'EXPANDABLE',
  nestingLevel: 0,
  metadata: {}
};

// Create necessary directories
const activitiesDir = path.join(MEMORY_PATH, 'activities');
const groupsDir = path.join(MEMORY_PATH, 'activity_groups');
const indexesDir = path.join(MEMORY_PATH, 'activity_indexes');
const taskIndexDir = path.join(indexesDir, 'task');
const entityIndexDir = path.join(indexesDir, 'entity');

async function ensureDirectories() {
  console.log('Ensuring directories exist...');
  await fs.promises.mkdir(activitiesDir, { recursive: true });
  await fs.promises.mkdir(groupsDir, { recursive: true });
  await fs.promises.mkdir(taskIndexDir, { recursive: true });
  await fs.promises.mkdir(entityIndexDir, { recursive: true });
}

// Write test activity to file
async function writeActivity() {
  console.log('Writing test activity...');
  const activityPath = path.join(activitiesDir, `${testActivity.id}.json`);
  await fs.promises.writeFile(activityPath, JSON.stringify(testActivity, null, 2), 'utf-8');
  console.log(`Activity written to ${activityPath}`);
}

// Read test activity from file
async function readActivity() {
  console.log('Reading test activity...');
  const activityPath = path.join(activitiesDir, `${testActivity.id}.json`);
  const data = await fs.promises.readFile(activityPath, 'utf-8');
  const activity = JSON.parse(data);
  console.log('Activity read successfully:', activity);
}

// Create test activity group
async function createActivityGroup() {
  console.log('Creating test activity group...');
  const groupId = `test-group-${uuidv4()}`;
  const group = {
    id: groupId,
    title: 'Test Activity Group',
    description: 'A group for testing activities',
    startTime: new Date().toISOString(),
    taskId: 'test-task-1',
    metadata: {}
  };
  
  const groupPath = path.join(groupsDir, `${groupId}.json`);
  await fs.promises.writeFile(groupPath, JSON.stringify(group, null, 2), 'utf-8');
  console.log(`Activity group written to ${groupPath}`);
  
  // Create task index
  const taskIndexPath = path.join(taskIndexDir, `${group.taskId}_groups.json`);
  let groups = [];
  
  try {
    const existingData = await fs.promises.readFile(taskIndexPath, 'utf-8');
    groups = JSON.parse(existingData);
  } catch (error) {
    // File doesn't exist yet, that's OK
  }
  
  groups.push(groupId);
  await fs.promises.writeFile(taskIndexPath, JSON.stringify(groups), 'utf-8');
  console.log(`Task index updated at ${taskIndexPath}`);
  
  return groupId;
}

// Complete activity group
async function completeActivityGroup(groupId) {
  console.log(`Completing activity group ${groupId}...`);
  const groupPath = path.join(groupsDir, `${groupId}.json`);
  const data = await fs.promises.readFile(groupPath, 'utf-8');
  const group = JSON.parse(data);
  
  group.endTime = new Date().toISOString();
  await fs.promises.writeFile(groupPath, JSON.stringify(group, null, 2), 'utf-8');
  console.log('Activity group completed');
}

// Clean up test activity
async function cleanup() {
  console.log('Cleaning up...');
  try {
    const activityPath = path.join(activitiesDir, `${testActivity.id}.json`);
    await fs.promises.unlink(activityPath);
    console.log(`Removed ${activityPath}`);
  } catch (error) {
    console.error('Error cleaning up activity:', error);
  }
}

// Main test function
async function runTest() {
  try {
    console.log('=== Testing Activity Tracking System ===');
    
    // Ensure directories exist
    await ensureDirectories();
    
    // Write test activity
    await writeActivity();
    
    // Read test activity
    await readActivity();
    
    // Create activity group
    const groupId = await createActivityGroup();
    
    // Complete activity group
    await completeActivityGroup(groupId);
    
    // Cleanup
    await cleanup();
    
    console.log('=== Test completed successfully ===');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest();

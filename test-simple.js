/**
 * Simple test for activity tracking
 */

import fs from 'fs';
import path from 'path';

// Get project root path
const ROOT_PATH = process.cwd();

// Path to .warp_memory directory
const MEMORY_PATH = path.join(ROOT_PATH, '.warp_memory');

// Check if directories exist
console.log('Checking directories...');
const activitiesDir = path.join(MEMORY_PATH, 'activities');
const groupsDir = path.join(MEMORY_PATH, 'activity_groups');
const indexesDir = path.join(MEMORY_PATH, 'activity_indexes');

console.log(`Activities directory: ${fs.existsSync(activitiesDir) ? 'Exists' : 'Missing'}`);
console.log(`Groups directory: ${fs.existsSync(groupsDir) ? 'Exists' : 'Missing'}`);
console.log(`Indexes directory: ${fs.existsSync(indexesDir) ? 'Exists' : 'Missing'}`);

// Create a test activity file
console.log('Creating test activity file...');
const testActivity = {
  id: 'test-act-1',
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

const activityPath = path.join(activitiesDir, 'test-act-1.json');
fs.writeFileSync(activityPath, JSON.stringify(testActivity, null, 2), 'utf-8');
console.log(`Test activity written to ${activityPath}`);

// Read the test activity file
console.log('Reading test activity file...');
const readActivity = JSON.parse(fs.readFileSync(activityPath, 'utf-8'));
console.log('Test activity read successfully:');
console.log(JSON.stringify(readActivity, null, 2));

// Clean up
console.log('Cleaning up...');
fs.unlinkSync(activityPath);
console.log('Test complete!');

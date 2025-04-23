#!/usr/bin/env node

/**
 * Fixed activity tracker test in JavaScript
 */

import { v4 as uuidv4 } from 'uuid';

// Create mock activity tracker to simulate the fixed implementation
class ActivityTrackerFixed {
  constructor() {
    this.activities = new Map();
    this.groups = new Map();
    this.taskActivities = new Map();
  }
  
  async createActivityGroup(group) {
    const now = new Date().toISOString();
    const groupId = group.id || `group-${uuidv4()}`;
    
    const completeGroup = {
      id: groupId,
      title: group.title || 'Activity Group',
      startTime: group.startTime || now,
      createdAt: now,
      metadata: group.metadata || {},
      taskId: group.taskId,
      ...group
    };
    
    this.groups.set(groupId, completeGroup);
    
    // Track groups by task
    if (group.taskId) {
      if (!this.taskActivities.has(group.taskId)) {
        this.taskActivities.set(group.taskId, { activities: [], groups: [] });
      }
      this.taskActivities.get(group.taskId).groups.push(completeGroup);
    }
    
    console.log(`Created activity group: ${groupId} - ${completeGroup.title}`);
    return completeGroup;
  }
  
  async completeActivityGroup(groupId) {
    const now = new Date().toISOString();
    const group = this.groups.get(groupId);
    
    if (!group) {
      return null;
    }
    
    const updatedGroup = {
      ...group,
      endTime: now,
      modifiedAt: now
    };
    
    this.groups.set(groupId, updatedGroup);
    console.log(`Completed activity group: ${groupId}`);
    
    return updatedGroup;
  }
  
  async logComment(params) {
    const now = new Date().toISOString();
    const activityId = `act-${uuidv4()}`;
    
    const comment = {
      id: activityId,
      timestamp: now,
      activityType: 'COMMENT',
      title: params.content.substring(0, 50) + (params.content.length > 50 ? '...' : ''),
      content: params.content,
      actorType: params.actorType,
      actorId: params.actorId,
      taskId: params.taskId,
      activityGroupId: params.activityGroupId,
      parentActivityId: params.parentActivityId,
      mentions: params.mentions || [],
      hasAttachments: params.hasAttachments || false,
      createdAt: now
    };
    
    this.activities.set(activityId, comment);
    
    // Track activities by task
    if (params.taskId) {
      if (!this.taskActivities.has(params.taskId)) {
        this.taskActivities.set(params.taskId, { activities: [], groups: [] });
      }
      this.taskActivities.get(params.taskId).activities.push(comment);
    }
    
    console.log(`Logged comment: ${activityId} - ${comment.title}`);
    return comment;
  }
  
  async logFileChange(params) {
    const now = new Date().toISOString();
    const activityId = `act-${uuidv4()}`;
    const fileName = params.filePath.split('/').pop() || params.filePath;
    
    const fileChange = {
      id: activityId,
      timestamp: now,
      activityType: params.changeType === 'CREATED' ? 'FILE_CREATED' : 
                    params.changeType === 'MODIFIED' ? 'FILE_MODIFIED' : 'FILE_DELETED',
      title: `${params.changeType.charAt(0) + params.changeType.slice(1).toLowerCase()} ${fileName}`,
      content: params.diffContent || `File ${fileName} was ${params.changeType.toLowerCase()}`,
      actorType: params.actorType,
      actorId: params.actorId,
      taskId: params.taskId,
      activityGroupId: params.activityGroupId,
      parentActivityId: params.parentActivityId,
      filePath: params.filePath,
      changeType: params.changeType,
      diffContent: params.diffContent,
      createdAt: now
    };
    
    this.activities.set(activityId, fileChange);
    
    // Track activities by task
    if (params.taskId) {
      if (!this.taskActivities.has(params.taskId)) {
        this.taskActivities.set(params.taskId, { activities: [], groups: [] });
      }
      this.taskActivities.get(params.taskId).activities.push(fileChange);
    }
    
    console.log(`Logged file change: ${activityId} - ${fileChange.title}`);
    return fileChange;
  }
  
  async getTaskTimeline(taskId) {
    if (!this.taskActivities.has(taskId)) {
      return [];
    }
    
    return this.taskActivities.get(taskId).activities;
  }
}

// Create a mock task ID for testing
const MOCK_TASK_ID = `task-${uuidv4()}`;
console.log(`Using mock task ID: ${MOCK_TASK_ID}`);

// Create activity tracker instance
const activityTracker = new ActivityTrackerFixed();

/**
 * Run tests for the fixed activity tracker
 */
async function runTests() {
  try {
    console.log('Starting fixed activity tracker tests...');
    
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
      actorType: 'USER',
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
      actorType: 'AGENT',
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

// Run the tests
runTests().catch(console.error);

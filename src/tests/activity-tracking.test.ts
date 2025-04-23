/**
 * Activity Tracking System Tests
 * 
 * This file contains basic tests for the activity tracking system.
 */

import path from 'path';
import fs from 'fs/promises';
import { ActivityTracker, ActorType, ActivityType } from '../services/activity';
import { AgentSystem } from '../services/agents/agent-system';
import { AgentRole } from '../services/agents/session-manager';

// Get project root path
const ROOT_PATH = path.resolve(process.cwd());

// Path to .warp_memory directory
const MEMORY_PATH = path.join(ROOT_PATH, '.warp_memory');

// Cleanup function to remove test activities
async function cleanup() {
  try {
    // Clean up activities directory
    const activitiesPath = path.join(MEMORY_PATH, 'activities');
    const activityFiles = await fs.readdir(activitiesPath);
    for (const file of activityFiles) {
      if (file.startsWith('test-')) {
        await fs.unlink(path.join(activitiesPath, file));
      }
    }
    
    // Clean up activity groups directory
    const groupsPath = path.join(MEMORY_PATH, 'activity_groups');
    const groupFiles = await fs.readdir(groupsPath);
    for (const file of groupFiles) {
      if (file.startsWith('test-')) {
        await fs.unlink(path.join(groupsPath, file));
      }
    }
    
    // Clean up indexes
    const taskIndexPath = path.join(MEMORY_PATH, 'activity_indexes', 'task');
    const taskIndexFiles = await fs.readdir(taskIndexPath);
    for (const file of taskIndexFiles) {
      if (file.startsWith('test-')) {
        await fs.unlink(path.join(taskIndexPath, file));
      }
    }
    
    const entityIndexPath = path.join(MEMORY_PATH, 'activity_indexes', 'entity');
    const entityIndexFiles = await fs.readdir(entityIndexPath);
    for (const file of entityIndexFiles) {
      if (file.startsWith('test-')) {
        await fs.unlink(path.join(entityIndexPath, file));
      }
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Test independent activity tracker
async function testActivityTracker() {
  console.log('\n----- Testing ActivityTracker -----');
  
  const activityTracker = new ActivityTracker(ROOT_PATH);
  
  // Create a test activity group
  console.log('Creating test activity group...');
  const group = await activityTracker.createActivityGroup({
    id: 'test-group-1',
    title: 'Test Activity Group',
    description: 'A group for testing purposes'
  });
  console.log(`Created group: ${group.id}`);
  
  // Create a test task activity
  console.log('Creating test task activity...');
  const taskActivity = await activityTracker.logActivity({
    id: 'test-act-1',
    activityType: ActivityType.TASK_CREATED,
    title: 'Test Task Created',
    content: 'This is a test task',
    actorType: ActorType.USER,
    actorId: 'test-user',
    taskId: 'test-task-1',
    activityGroupId: group.id
  });
  console.log(`Created task activity: ${taskActivity.id}`);
  
  // Create a test comment
  console.log('Creating test comment...');
  const comment = await activityTracker.logComment({
    id: 'test-act-2',
    content: 'This is a test comment',
    actorType: ActorType.USER,
    actorId: 'test-user',
    taskId: 'test-task-1',
    activityGroupId: group.id
  });
  console.log(`Created comment: ${comment.id}`);
  
  // Create a test reply
  console.log('Creating test reply...');
  const reply = await activityTracker.logComment({
    id: 'test-act-3',
    content: 'This is a test reply',
    actorType: ActorType.AGENT,
    actorId: 'ORCHESTRATOR',
    taskId: 'test-task-1',
    parentActivityId: comment.id,
    activityGroupId: group.id
  });
  console.log(`Created reply: ${reply.id}`);
  
  // Create a test file change
  console.log('Creating test file change...');
  const fileChange = await activityTracker.logFileChange({
    id: 'test-act-4',
    filePath: 'src/index.ts',
    changeType: 'MODIFIED',
    diffContent: 'Some diff content',
    actorType: ActorType.AGENT,
    actorId: 'BACKEND_ENGINEER',
    taskId: 'test-task-1',
    activityGroupId: group.id
  });
  console.log(`Created file change: ${fileChange.id}`);
  
  // Create a test command
  console.log('Creating test command execution...');
  const command = await activityTracker.logCommand({
    id: 'test-act-5',
    command: 'npm install',
    output: 'Successfully installed packages',
    exitCode: 0,
    actorType: ActorType.AGENT,
    actorId: 'BACKEND_ENGINEER',
    taskId: 'test-task-1',
    activityGroupId: group.id
  });
  console.log(`Created command execution: ${command.id}`);
  
  // Create a test agent transition
  console.log('Creating test agent transition...');
  const transition = await activityTracker.logAgentTransition({
    id: 'test-act-6',
    fromRole: 'ORCHESTRATOR',
    toRole: 'BACKEND_ENGINEER',
    reason: 'Testing agent transition',
    taskId: 'test-task-1',
    activityGroupId: group.id
  });
  console.log(`Created agent transition: ${transition.id}`);
  
  // Get task timeline
  console.log('Getting task timeline...');
  const timeline = await activityTracker.getTaskTimeline('test-task-1');
  console.log(`Got ${timeline.length} activities for task test-task-1`);
  
  // Get activity thread
  console.log('Getting activity thread...');
  const thread = await activityTracker.getActivityThread(comment.id);
  console.log(`Got ${thread.length} activities in thread for comment ${comment.id}`);
  
  // Get file activities
  console.log('Getting file activities...');
  const fileActivities = await activityTracker.getFileActivities('src/index.ts');
  console.log(`Got ${fileActivities.length} activities for file src/index.ts`);
  
  // Complete activity group
  console.log('Completing activity group...');
  const completedGroup = await activityTracker.completeActivityGroup(group.id);
  console.log(`Completed group: ${completedGroup?.id}, end time: ${completedGroup?.endTime}`);
  
  console.log('----- ActivityTracker tests completed -----');
}

// Test integration with agent system
async function testAgentSystemIntegration() {
  console.log('\n----- Testing AgentSystem Integration -----');
  
  const agentSystem = new AgentSystem(ROOT_PATH);
  
  // Initialize agent system
  console.log('Initializing agent system...');
  await agentSystem.initialize();
  
  // Create a test task
  console.log('Creating test task...');
  const task = await agentSystem.createTask(
    'Test Integration Task',
    'This is a task for testing integration',
    'TEST'
  );
  console.log(`Created task: ${task.id}`);
  
  // Start a session
  console.log('Starting agent session...');
  const session = await agentSystem.startSession(AgentRole.ORCHESTRATOR, task.id);
  console.log(`Started session: ${session.sessionId}`);
  
  // Add a comment
  console.log('Adding comment...');
  const comment = await agentSystem.addComment('This is a test comment from agent system');
  console.log(`Added comment: ${comment.id}`);
  
  // Log a file change
  console.log('Logging file change...');
  const fileChange = await agentSystem.logFileChange(
    'src/test.ts',
    'CREATED',
    'New file content'
  );
  console.log(`Logged file change: ${fileChange.id}`);
  
  // Log a command execution
  console.log('Logging command execution...');
  const command = await agentSystem.logCommandExecution(
    'echo "Hello World"',
    'Hello World',
    0
  );
  console.log(`Logged command execution: ${command.id}`);
  
  // Update task status
  console.log('Updating task status...');
  const updatedTask = await agentSystem.updateTaskStatus(task.id, 'IN_PROGRESS');
  console.log(`Updated task status to: ${updatedTask.status}`);
  
  // Create an activity group
  console.log('Creating activity group...');
  const groupId = await agentSystem.createActivityGroup('Test Integration Group');
  console.log(`Created activity group: ${groupId}`);
  
  // Transition to a different agent
  console.log('Transitioning to a different agent...');
  const transitionResult = await agentSystem.transitionTo(
    AgentRole.BACKEND_ENGINEER,
    'Testing agent transition'
  );
  console.log(`Transitioned to: ${transitionResult.activeRole}`);
  
  // Complete the activity group
  console.log('Completing activity group...');
  await agentSystem.completeActivityGroup(groupId);
  console.log('Completed activity group');
  
  // Get task timeline
  console.log('Getting task timeline...');
  const timeline = await agentSystem.getTaskTimeline(task.id);
  console.log(`Got ${timeline.length} activities for task ${task.id}`);
  
  // End the session
  console.log('Ending session...');
  const ended = await agentSystem.endSession();
  console.log(`Session ended: ${ended}`);
  
  console.log('----- AgentSystem integration tests completed -----');
}

// Main test function
async function runTests() {
  try {
    // Clean up any existing test data
    await cleanup();
    
    // Run ActivityTracker tests
    await testActivityTracker();
    
    // Run AgentSystem integration tests
    await testAgentSystemIntegration();
    
    // Clean up test data
    await cleanup();
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run tests
runTests();

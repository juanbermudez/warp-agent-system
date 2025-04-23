#!/bin/bash

# Agent Activity Integration Fixed Test Script
# This script runs the fixed agent activity integration

echo "==== Testing Fixed Agent Activity Integration ===="

# Create a JavaScript version of the agent integration
mkdir -p js_test/services/agent
cat > js_test/services/agent/agent-activity-integration-fixed.js << 'EOL'
/**
 * Fixed Agent Activity Integration in JavaScript
 */

// Import the mock activity tracker
class ActivityTrackerFixed {
  constructor() {
    this.activities = new Map();
    this.groups = new Map();
    this.taskActivities = new Map();
  }
  
  async createActivityGroup(group) {
    const now = new Date().toISOString();
    const groupId = group.id || `group-${Math.random().toString(36).substring(2, 10)}`;
    
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
    const activityId = `act-${Math.random().toString(36).substring(2, 10)}`;
    
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
    const activityId = `act-${Math.random().toString(36).substring(2, 10)}`;
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
  
  async logCommand(params) {
    const now = new Date().toISOString();
    const activityId = `act-${Math.random().toString(36).substring(2, 10)}`;
    
    const command = {
      id: activityId,
      timestamp: now,
      activityType: 'COMMAND_EXECUTED',
      title: `Executed: ${params.command.substring(0, 40)}${params.command.length > 40 ? '...' : ''}`,
      content: `Command: ${params.command}\nExit Code: ${params.exitCode}\nOutput: ${params.output}`,
      actorType: params.actorType,
      actorId: params.actorId,
      taskId: params.taskId,
      activityGroupId: params.activityGroupId,
      parentActivityId: params.parentActivityId,
      command: params.command,
      output: params.output,
      exitCode: params.exitCode,
      createdAt: now
    };
    
    this.activities.set(activityId, command);
    
    // Track activities by task
    if (params.taskId) {
      if (!this.taskActivities.has(params.taskId)) {
        this.taskActivities.set(params.taskId, { activities: [], groups: [] });
      }
      this.taskActivities.get(params.taskId).activities.push(command);
    }
    
    console.log(`Logged command: ${activityId} - ${command.title}`);
    return command;
  }
  
  async logAgentTransition(params) {
    const now = new Date().toISOString();
    const activityId = `act-${Math.random().toString(36).substring(2, 10)}`;
    
    const transition = {
      id: activityId,
      timestamp: now,
      activityType: 'AGENT_TRANSITION',
      title: `Transition: ${params.fromRole} → ${params.toRole}`,
      content: params.reason,
      actorType: 'SYSTEM',
      actorId: params.actorId,
      taskId: params.taskId,
      activityGroupId: params.activityGroupId,
      parentActivityId: params.parentActivityId,
      fromRole: params.fromRole,
      toRole: params.toRole,
      reason: params.reason,
      createdAt: now
    };
    
    this.activities.set(activityId, transition);
    
    // Track activities by task
    if (params.taskId) {
      if (!this.taskActivities.has(params.taskId)) {
        this.taskActivities.set(params.taskId, { activities: [], groups: [] });
      }
      this.taskActivities.get(params.taskId).activities.push(transition);
    }
    
    console.log(`Logged transition: ${activityId} - ${transition.title}`);
    return transition;
  }
  
  async getTaskTimeline(taskId) {
    if (!this.taskActivities.has(taskId)) {
      return [];
    }
    
    return this.taskActivities.get(taskId).activities;
  }
}

/**
 * Agent Activity Logger
 */
class AgentActivityLogger {
  constructor(agentId, role, taskId) {
    this.activityTracker = new ActivityTrackerFixed();
    this.metadata = {
      agentId,
      role,
      taskId
    };
    this.currentGroupId = null;
  }
  
  async startActivityGroup(title, description) {
    try {
      // Complete any existing group
      if (this.currentGroupId) {
        await this.completeActivityGroup();
      }
      
      // Create a new group
      const group = await this.activityTracker.createActivityGroup({
        title,
        description,
        taskId: this.metadata.taskId
      });
      
      this.currentGroupId = group.id;
      return group.id;
    } catch (error) {
      console.error('Error starting activity group:', error);
      throw error;
    }
  }
  
  async completeActivityGroup() {
    if (!this.currentGroupId) {
      return null;
    }
    
    try {
      const completedGroup = await this.activityTracker.completeActivityGroup(this.currentGroupId);
      this.currentGroupId = null;
      return completedGroup;
    } catch (error) {
      console.error('Error completing activity group:', error);
      throw error;
    }
  }
  
  async logComment(content, parentActivityId) {
    try {
      return await this.activityTracker.logComment({
        content,
        actorType: 'AGENT',
        actorId: this.metadata.agentId,
        taskId: this.metadata.taskId,
        activityGroupId: this.currentGroupId,
        parentActivityId,
        hasAttachments: false
      });
    } catch (error) {
      console.error('Error logging comment:', error);
      throw error;
    }
  }
  
  async logCommand(command, output, exitCode) {
    try {
      return await this.activityTracker.logCommand({
        command,
        output,
        exitCode,
        actorType: 'AGENT',
        actorId: this.metadata.agentId,
        taskId: this.metadata.taskId,
        activityGroupId: this.currentGroupId
      });
    } catch (error) {
      console.error('Error logging command:', error);
      throw error;
    }
  }
  
  async logFileChange(filePath, changeType, diffContent) {
    try {
      return await this.activityTracker.logFileChange({
        filePath,
        changeType,
        diffContent,
        actorType: 'AGENT',
        actorId: this.metadata.agentId,
        taskId: this.metadata.taskId,
        activityGroupId: this.currentGroupId
      });
    } catch (error) {
      console.error('Error logging file change:', error);
      throw error;
    }
  }
  
  async logTransition(fromRole, toRole, reason) {
    try {
      return await this.activityTracker.logAgentTransition({
        fromRole,
        toRole,
        reason,
        actorId: this.metadata.agentId,
        taskId: this.metadata.taskId,
        activityGroupId: this.currentGroupId
      });
    } catch (error) {
      console.error('Error logging transition:', error);
      throw error;
    }
  }
  
  setTaskId(taskId) {
    this.metadata.taskId = taskId;
  }
  
  async getTaskTimeline() {
    if (!this.metadata.taskId) {
      throw new Error('No task ID set');
    }
    
    try {
      return await this.activityTracker.getTaskTimeline(this.metadata.taskId);
    } catch (error) {
      console.error('Error getting task timeline:', error);
      throw error;
    }
  }
}

/**
 * Example usage
 */
async function agentActivityExample() {
  // Initialize the activity logger for an agent
  const logger = new AgentActivityLogger('agent-123', 'Backend_Engineer', 'task-456');
  
  try {
    // Start an activity group for a task
    await logger.startActivityGroup('Implementing API Endpoint', 'Creating a new API endpoint for the user service');
    
    // Log the agent's thought process
    const comment = await logger.logComment('I will need to create a new controller and update the route configuration.');
    
    // Log a file change
    await logger.logFileChange('/src/controllers/UserController.ts', 'CREATED', 
      '+ export class UserController {\n+   async getUser(req, res) {\n+     // Implementation\n+   }\n+ }');
    
    // Log a command execution
    await logger.logCommand('npm test', 'All tests passed', 0);
    
    // Log a reply to the original comment
    await logger.logComment('Controller implementation complete. Moving on to route configuration.', comment.id);
    
    // Log another file change
    await logger.logFileChange('/src/routes/index.ts', 'MODIFIED',
      '- // User routes will go here\n+ import { UserController } from "../controllers/UserController";\n+ router.get("/users/:id", new UserController().getUser);');
    
    // Complete the activity group
    await logger.completeActivityGroup();
    
    // Start a new activity group for testing
    await logger.startActivityGroup('Testing API Endpoint', 'Running tests for the new endpoint');
    
    // Log a command execution for testing
    await logger.logCommand('npm run test:integration', 'User API tests passed', 0);
    
    // Log the agent's conclusion
    await logger.logComment('API endpoint implemented and tested successfully.');
    
    // Complete the group
    await logger.completeActivityGroup();
    
    // Log a role transition
    await logger.logTransition('Backend_Engineer', 'QA_Tester', 'Implementation complete, moving to comprehensive testing');
    
    // Get task timeline
    const timeline = await logger.getTaskTimeline();
    console.log(`\nTask Timeline (${timeline.length} activities):`);
    for (const activity of timeline) {
      console.log(`- ${activity.activityType}: ${activity.title}`);
    }
    
    console.log('\nActivity logging example completed successfully!');
  } catch (error) {
    console.error('Error in agent activity example:', error);
  }
}

// Export the agent activity logger
export { AgentActivityLogger, agentActivityExample };
EOL

# Create the agent test script
cat > js_test/tests/agent-activity-fixed-test.js << 'EOL'
#!/usr/bin/env node

/**
 * Agent Activity Integration Fixed Test
 */

import { agentActivityExample } from '../services/agent/agent-activity-integration-fixed.js';

console.log('==== Starting Agent Activity Integration Test ====');

// Run the agent activity example
agentActivityExample().then(() => {
  console.log('==== Agent Activity Integration Test Complete ====');
}).catch(error => {
  console.error('Error in agent activity test:', error);
  process.exit(1);
});
EOL

# Create a runner for the agent test
cat > js_test/run-agent-test.js << 'EOL'
#!/usr/bin/env node

/**
 * Runner for the agent activity integration test
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('==== Running Agent Activity Integration Test ====');

// Run the test
const test = spawn('node', ['tests/agent-activity-fixed-test.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

test.on('close', (code) => {
  console.log(`==== Test complete with code: ${code} ====`);
});
EOL

# Make the test runner executable
chmod +x js_test/run-agent-test.js

# Run the agent integration test
node js_test/run-agent-test.js

echo "==== Agent Activity Integration Test Complete ===="

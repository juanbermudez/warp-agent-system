# Agent Activity Integration Guide

This guide explains how to integrate the CKG-based Activity Tracking System with Warp Agents to capture all agent operations in a structured, queryable format.

## Overview

The Activity Tracking System allows agents to log their activities, decisions, and outputs to the Code Knowledge Graph (CKG). This provides a comprehensive timeline of agent operations and enables rich querying and analysis of agent behavior.

## Setting Up Agent Activity Logging

### 1. Import the Agent Activity Logger

In your agent implementation file, import the AgentActivityLogger:

```typescript
import { AgentActivityLogger } from '../services/agent-activity-integration.js';
```

### 2. Initialize the Logger

Initialize the logger with the agent's ID, role, and task ID:

```typescript
class BackendEngineerAgent {
  private activityLogger: AgentActivityLogger;
  
  constructor(agentId: string, taskId?: string) {
    this.activityLogger = new AgentActivityLogger(
      agentId,
      'Backend_Engineer',
      taskId
    );
  }
  
  // Agent implementation...
}
```

### 3. Log Activities During Agent Operation

Now you can log various activities throughout your agent's operation:

#### Starting an Activity Group

Use activity groups to organize related activities within a task:

```typescript
async implementFeature(featureSpec: string) {
  // Start an activity group for the feature implementation
  await this.activityLogger.startActivityGroup(
    'Implementing Feature: API Endpoint',
    'Creating a new API endpoint based on specifications'
  );
  
  // Implementation...
  
  // Complete the group when done
  await this.activityLogger.completeActivityGroup();
}
```

#### Logging Agent Thoughts

Log the agent's thought process and decisions:

```typescript
async planImplementation(spec: string) {
  // Log the agent's thought process
  await this.activityLogger.logComment(
    `Analyzing spec: ${spec}\n\nI'll need to create the following components:\n` +
    `1. Controller class\n2. Route configuration\n3. Service methods\n4. Unit tests`
  );
  
  // Continue with implementation...
}
```

#### Logging File Changes

Track file modifications made by the agent:

```typescript
async createControllerFile(controllerPath: string, code: string) {
  // Write the file
  await fs.writeFile(controllerPath, code);
  
  // Log the file creation
  await this.activityLogger.logFileChange(
    controllerPath,
    'CREATED',
    `+ ${code}`
  );
}

async updateRouteConfig(routePath: string, oldCode: string, newCode: string) {
  // Update the file
  await fs.writeFile(routePath, newCode);
  
  // Generate a simple diff
  const diff = generateDiff(oldCode, newCode);
  
  // Log the file modification
  await this.activityLogger.logFileChange(
    routePath,
    'MODIFIED',
    diff
  );
}
```

#### Logging Command Executions

Track commands run by the agent:

```typescript
async runTests() {
  // Execute the command
  const { stdout, stderr, exitCode } = await execCommand('npm test');
  
  // Log the command execution
  await this.activityLogger.logCommand(
    'npm test',
    stdout + stderr,
    exitCode
  );
  
  return exitCode === 0;
}
```

#### Logging Role Transitions

When an agent transitions between roles:

```typescript
async transitionToQA() {
  // Log the transition
  await this.activityLogger.logTransition(
    'Backend_Engineer',
    'QA_Tester',
    'Implementation complete, starting testing phase'
  );
  
  // Perform role transition logic...
}
```

### 4. Querying Agent Activities

To view the agent's activity timeline:

```typescript
async getAgentHistory() {
  const timeline = await this.activityLogger.getTaskTimeline();
  
  // Process and analyze the timeline
  return timeline;
}
```

## Best Practices

1. **Group Related Activities**: Use activity groups to organize related operations, making the timeline more structured.

2. **Log Meaningful Comments**: Include detailed reasoning and decision-making processes in comments.

3. **Be Consistent**: Log activities at consistent points in the agent's workflow.

4. **Include Context**: When logging file changes, include meaningful diff content.

5. **Track Commands**: Log all significant command executions with their outputs.

6. **Record Transitions**: Always log role transitions with clear reasons.

## Example Agent Implementation

Here's a simplified example of an agent implementation using the activity logger:

```typescript
import { AgentActivityLogger } from '../services/agent-activity-integration.js';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class BackendEngineerAgent {
  private activityLogger: AgentActivityLogger;
  
  constructor(agentId: string, taskId?: string) {
    this.activityLogger = new AgentActivityLogger(
      agentId,
      'Backend_Engineer',
      taskId
    );
  }
  
  async implementFeature(featureSpec: string) {
    // Start an activity group
    await this.activityLogger.startActivityGroup('Feature Implementation');
    
    // Log initial thoughts
    await this.activityLogger.logComment(
      `Analyzing feature spec: ${featureSpec}\n\nInitial planning...`
    );
    
    // Create a file
    const code = `export class UserController {\n  getUser(req, res) {\n    // Implementation\n  }\n}`;
    await fs.writeFile('/src/controllers/UserController.ts', code);
    await this.activityLogger.logFileChange(
      '/src/controllers/UserController.ts',
      'CREATED',
      `+ ${code}`
    );
    
    // Run tests
    const { stdout, stderr, exitCode } = await execAsync('npm test');
    await this.activityLogger.logCommand('npm test', stdout + stderr, exitCode);
    
    // Complete the group
    await this.activityLogger.completeActivityGroup();
    
    // Transition to QA if successful
    if (exitCode === 0) {
      await this.activityLogger.logTransition(
        'Backend_Engineer',
        'QA_Tester',
        'Implementation complete, starting testing phase'
      );
    }
    
    return exitCode === 0;
  }
}
```

This approach ensures that all significant agent operations are logged in a structured, queryable format, providing transparency and facilitating debugging and analysis.

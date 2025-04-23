/**
 * Agent Activity Integration
 * 
 * This file demonstrates how to integrate the CKG-based Activity Tracking System
 * with the Warp Agent System.
 */

import { ActivityTrackerCKG } from './activity/activity-tracker-ckg.js';
import { ActorType, ActivityType, RenderMode } from './activity/types-ckg.js';

/**
 * Interface for agent metadata
 */
interface AgentMetadata {
  agentId: string;
  role: string;
  taskId?: string;
}

/**
 * Agent Activity Logger
 * 
 * A utility class that agents can use to log their activities to the CKG.
 */
export class AgentActivityLogger {
  private activityTracker: ActivityTrackerCKG;
  private metadata: AgentMetadata;
  private currentGroupId: string | null = null;
  
  /**
   * Create a new agent activity logger
   * 
   * @param agentId The agent's ID
   * @param role The agent's role
   * @param taskId Optional task ID
   */
  constructor(agentId: string, role: string, taskId?: string) {
    this.activityTracker = new ActivityTrackerCKG();
    this.metadata = {
      agentId,
      role,
      taskId
    };
  }
  
  /**
   * Start a new activity group for a task or operation
   * 
   * @param title Title of the activity group
   * @param description Optional description of the group
   * @returns The ID of the created group
   */
  async startActivityGroup(title: string, description?: string): Promise<string> {
    try {
      // Complete any existing group
      if (this.currentGroupId) {
        await this.completeActivityGroup();
      }
      
      // Create a new group
      const group = await this.activityTracker.createActivityGroup({
        title,
        description,
        taskId: this.metadata.taskId || undefined
      });
      
      this.currentGroupId = group.id || '';
      return group.id || '';
    } catch (error) {
      console.error('Error starting activity group:', error);
      throw error;
    }
  }
  
  /**
   * Complete the current activity group
   * 
   * @returns The completed group or null if no group is active
   */
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
  
  /**
   * Log a comment from the agent
   * 
   * @param content The comment content
   * @param parentActivityId Optional parent activity ID for replies
   * @returns The created comment activity
   */
  async logComment(content: string, parentActivityId?: string): Promise<any> {
    try {
      return await this.activityTracker.logComment({
        content,
        actorType: ActorType.AGENT,
        actorId: this.metadata.agentId,
        taskId: this.metadata.taskId,
        activityGroupId: this.currentGroupId || undefined,
        parentActivityId,
        hasAttachments: false
      });
    } catch (error) {
      console.error('Error logging comment:', error);
      throw error;
    }
  }
  
  /**
   * Log a command execution
   * 
   * @param command The command that was executed
   * @param output The command output
   * @param exitCode The command exit code
   * @returns The created command activity
   */
  async logCommand(command: string, output: string, exitCode: number): Promise<any> {
    try {
      return await this.activityTracker.logCommand({
        command,
        output,
        exitCode,
        actorType: ActorType.AGENT,
        actorId: this.metadata.agentId,
        taskId: this.metadata.taskId,
        activityGroupId: this.currentGroupId || undefined
      });
    } catch (error) {
      console.error('Error logging command:', error);
      throw error;
    }
  }
  
  /**
   * Log a file change
   * 
   * @param filePath The path of the file that was changed
   * @param changeType The type of change (CREATED, MODIFIED, DELETED)
   * @param diffContent Optional diff content showing the changes
   * @returns The created file change activity
   */
  async logFileChange(
    filePath: string, 
    changeType: 'CREATED' | 'MODIFIED' | 'DELETED', 
    diffContent?: string
  ): Promise<any> {
    try {
      return await this.activityTracker.logFileChange({
        filePath,
        changeType,
        diffContent,
        actorType: ActorType.AGENT,
        actorId: this.metadata.agentId,
        taskId: this.metadata.taskId,
        activityGroupId: this.currentGroupId || undefined
      });
    } catch (error) {
      console.error('Error logging file change:', error);
      throw error;
    }
  }
  
  /**
   * Log a role transition for the agent
   * 
   * @param fromRole The role the agent is transitioning from
   * @param toRole The role the agent is transitioning to
   * @param reason The reason for the transition
   * @returns The created transition activity
   */
  async logTransition(fromRole: string, toRole: string, reason: string): Promise<any> {
    try {
      return await this.activityTracker.logAgentTransition({
        fromRole,
        toRole,
        reason,
        actorId: this.metadata.agentId,
        taskId: this.metadata.taskId,
        activityGroupId: this.currentGroupId || undefined
      });
    } catch (error) {
      console.error('Error logging transition:', error);
      throw error;
    }
  }
  
  /**
   * Set the current task ID
   * 
   * @param taskId The task ID
   */
  setTaskId(taskId: string) {
    this.metadata.taskId = taskId;
  }
  
  /**
   * Get the timeline for the current task
   * 
   * @returns An array of activities for the task
   */
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
 * Example usage in an agent
 */
export async function agentActivityExample() {
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
    
    console.log('Activity logging example completed successfully!');
  } catch (error) {
    console.error('Error in agent activity example:', error);
  }
}

// Execute if this script is run directly
if (require.main === module) {
  agentActivityExample().catch(console.error);
}

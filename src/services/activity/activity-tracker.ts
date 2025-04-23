/**
 * Activity Tracker Service
 * 
 * Main service for logging and retrieving activities in the Warp system.
 * Provides specialized methods for different activity types and supports
 * timeline generation with filtering options.
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { 
  Activity, ActivityGroup, ActorType, ActivityType, 
  RenderMode, FileChangeActivity, CommentActivity,
  CommandActivity, AgentTransitionActivity, TimelineOptions
} from './types';
import { ActivityStorage } from './storage';

/**
 * Service for tracking and retrieving activities.
 */
export class ActivityTracker {
  private storage: ActivityStorage;
  
  /**
   * Creates a new ActivityTracker instance.
   * 
   * @param rootPath The root path of the project
   */
  constructor(rootPath: string) {
    this.storage = new ActivityStorage(rootPath);
  }
  
  /**
   * Logs a generic activity.
   * 
   * @param activity Partial activity object to log
   * @returns The complete stored activity
   */
  async logActivity(activity: Partial<Activity>): Promise<Activity> {
    const completeActivity: Activity = {
      id: `act-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      actorType: activity.actorType || ActorType.SYSTEM,
      actorId: activity.actorId || 'system',
      activityType: activity.activityType || ActivityType.CUSTOM,
      title: activity.title || 'Activity',
      content: activity.content || '',
      renderMode: activity.renderMode || RenderMode.EXPANDABLE,
      nestingLevel: activity.nestingLevel || 0,
      metadata: activity.metadata || {},
      ...activity
    };
    
    return this.storage.storeActivity(completeActivity);
  }
  
  /**
   * Creates a new activity group.
   * 
   * @param group Partial activity group object
   * @returns The complete stored activity group
   */
  async createActivityGroup(group: Partial<ActivityGroup>): Promise<ActivityGroup> {
    const completeGroup: ActivityGroup = {
      id: `group-${uuidv4()}`,
      title: group.title || 'Activity Group',
      startTime: new Date().toISOString(),
      taskId: group.taskId,
      parentGroupId: group.parentGroupId,
      metadata: group.metadata || {},
      ...group
    };
    
    return this.storage.storeActivityGroup(completeGroup);
  }
  
  /**
   * Completes an activity group by setting its end time.
   * 
   * @param groupId The ID of the group to complete
   * @returns The updated activity group or null if not found
   */
  async completeActivityGroup(groupId: string): Promise<ActivityGroup | null> {
    return this.storage.completeActivityGroup(groupId);
  }
  
  /**
   * Logs a file change activity.
   * 
   * @param params Parameters for the file change
   * @returns The stored file change activity
   */
  async logFileChange(params: {
    filePath: string;
    changeType: 'CREATED' | 'MODIFIED' | 'DELETED';
    actorType: ActorType;
    actorId: string;
    taskId?: string;
    activityGroupId?: string;
    diffContent?: string;
  }): Promise<FileChangeActivity> {
    const { filePath, changeType, diffContent, ...rest } = params;
    const fileName = path.basename(filePath);
    
    const activity: FileChangeActivity = {
      id: `act-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      activityType: 
        changeType === 'CREATED' ? ActivityType.FILE_CREATED :
        changeType === 'MODIFIED' ? ActivityType.FILE_MODIFIED : 
        ActivityType.FILE_DELETED,
      title: `${changeType.charAt(0) + changeType.slice(1).toLowerCase()} ${fileName}`,
      content: diffContent || `File ${fileName} was ${changeType.toLowerCase()}`,
      renderMode: RenderMode.EXPANDABLE,
      nestingLevel: 0,
      metadata: {},
      relatedEntityIds: [filePath],
      filePath,
      changeType,
      diffContent,
      ...rest
    };
    
    return this.storage.storeActivity(activity) as Promise<FileChangeActivity>;
  }
  
  /**
   * Logs a comment activity.
   * 
   * @param params Parameters for the comment
   * @returns The stored comment activity
   */
  async logComment(params: {
    content: string;
    actorType: ActorType;
    actorId: string;
    taskId?: string;
    activityGroupId?: string;
    parentActivityId?: string;
    mentions?: string[];
    hasAttachments?: boolean;
  }): Promise<CommentActivity> {
    const { content, mentions, hasAttachments, ...rest } = params;
    
    const activity: CommentActivity = {
      id: `act-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      activityType: ActivityType.COMMENT,
      title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      renderMode: RenderMode.ALWAYS_EXPANDED,
      nestingLevel: rest.parentActivityId ? 1 : 0,
      metadata: {},
      mentions: mentions || [],
      hasAttachments: hasAttachments || false,
      ...rest
    };
    
    return this.storage.storeActivity(activity) as Promise<CommentActivity>;
  }
  
  /**
   * Logs a command execution activity.
   * 
   * @param params Parameters for the command execution
   * @returns The stored command activity
   */
  async logCommand(params: {
    command: string;
    output: string;
    exitCode: number;
    actorType: ActorType;
    actorId: string;
    taskId?: string;
    activityGroupId?: string;
  }): Promise<CommandActivity> {
    const { command, output, exitCode, ...rest } = params;
    
    const activity: CommandActivity = {
      id: `act-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      activityType: ActivityType.COMMAND_EXECUTED,
      title: `Executed: ${command.substring(0, 40)}${command.length > 40 ? '...' : ''}`,
      content: `Command: ${command}\nExit Code: ${exitCode}\nOutput: ${output}`,
      renderMode: RenderMode.EXPANDABLE,
      nestingLevel: 0,
      metadata: {},
      command,
      output,
      exitCode,
      ...rest
    };
    
    return this.storage.storeActivity(activity) as Promise<CommandActivity>;
  }
  
  /**
   * Logs an agent transition activity.
   * 
   * @param params Parameters for the agent transition
   * @returns The stored agent transition activity
   */
  async logAgentTransition(params: {
    fromRole: string;
    toRole: string;
    reason: string;
    taskId?: string;
    activityGroupId?: string;
  }): Promise<AgentTransitionActivity> {
    const { fromRole, toRole, reason, ...rest } = params;
    
    const activity: AgentTransitionActivity = {
      id: `act-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      actorType: ActorType.SYSTEM,
      actorId: 'agent-system',
      activityType: ActivityType.AGENT_TRANSITION,
      title: `Transition: ${fromRole} → ${toRole}`,
      content: reason,
      renderMode: RenderMode.EXPANDABLE,
      nestingLevel: 0,
      metadata: {},
      fromRole,
      toRole,
      reason,
      ...rest
    };
    
    return this.storage.storeActivity(activity) as Promise<AgentTransitionActivity>;
  }
  
  /**
   * Gets an activity by ID.
   * 
   * @param id The activity ID
   * @returns The activity or null if not found
   */
  async getActivity(id: string): Promise<Activity | null> {
    return this.storage.getActivity(id);
  }
  
  /**
   * Gets all activities for a task with filtering options.
   * 
   * @param taskId The task ID
   * @param options Filtering and formatting options
   * @returns An array of activities
   */
  async getTaskTimeline(taskId: string, options?: Partial<TimelineOptions>): Promise<Activity[]> {
    const defaultOptions: TimelineOptions = {
      includeNested: true,
      defaultExpanded: false,
      groupByType: false,
      filterTypes: undefined,
      filterActors: undefined
    };
    
    const fullOptions = { ...defaultOptions, ...options };
    let activities = await this.storage.getTaskActivities(taskId);
    
    // Apply filters
    if (fullOptions.filterTypes) {
      activities = activities.filter(a => fullOptions.filterTypes!.includes(a.activityType));
    }
    
    if (fullOptions.filterActors) {
      activities = activities.filter(a => fullOptions.filterActors!.includes(a.actorType));
    }
    
    if (!fullOptions.includeNested) {
      activities = activities.filter(a => !a.parentActivityId);
    }
    
    // Sort by timestamp
    activities.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return activities;
  }
  
  /**
   * Gets an activity thread (parent and all children).
   * 
   * @param parentActivityId The parent activity ID
   * @returns An array of activities in the thread
   */
  async getActivityThread(parentActivityId: string): Promise<Activity[]> {
    const parent = await this.storage.getActivity(parentActivityId);
    if (!parent) return [];
    
    if (!parent.taskId) {
      return [parent]; // Can't find children without task ID
    }
    
    // First, get all task activities
    let allActivities = await this.storage.getTaskActivities(parent.taskId);
    
    // Filter to just this thread - parent and children
    const thread = allActivities.filter(a => 
      a.id === parentActivityId || a.parentActivityId === parentActivityId
    );
    
    // Sort by timestamp
    thread.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return thread;
  }
  
  /**
   * Gets all activities for a file.
   * 
   * @param filePath The file path
   * @returns An array of activities
   */
  async getFileActivities(filePath: string): Promise<Activity[]> {
    return this.storage.getEntityActivities(filePath);
  }
  
  /**
   * Gets all activity groups for a task.
   * 
   * @param taskId The task ID
   * @returns An array of activity groups
   */
  async getTaskActivityGroups(taskId: string): Promise<ActivityGroup[]> {
    const groupIds = await this.storage.getTaskActivityGroups(taskId);
    const groups: ActivityGroup[] = [];
    
    for (const id of groupIds) {
      const group = await this.storage.getActivityGroup(id);
      if (group) {
        groups.push(group);
      }
    }
    
    // Sort by start time
    return groups.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }
}

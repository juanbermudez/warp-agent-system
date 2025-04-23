/**
 * Activity Tracker Service - CKG Implementation
 * 
 * Main service for logging and retrieving activities in the Warp system.
 * Uses the Code Knowledge Graph (CKG) for storage and retrieval.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Activity, ActivityGroup, ActorType, ActivityType, 
  RenderMode, FileChangeActivity, CommentActivity,
  CommandActivity, AgentTransitionActivity, TimelineOptions,
  FileChangeType
} from './types-ckg';
import { queryCkg } from '../../tools/query_ckg.js';
import { updateCkg } from '../../tools/update_ckg.js';

/**
 * Service for tracking and retrieving activities using the CKG database.
 */
export class ActivityTrackerCKG {
  /**
   * Creates a new ActivityTrackerCKG instance.
   */
  constructor() {
    // No initialization needed for CKG-based implementation
  }
  
  /**
   * Logs a generic activity.
   * 
   * @param activity Partial activity object to log
   * @returns The complete stored activity
   */
  async logActivity(activity: Partial<Activity>): Promise<Activity> {
    const now = new Date().toISOString();
    
    const completeActivity: Activity = {
      id: activity.id || `act-${uuidv4()}`,
      timestamp: activity.timestamp || now,
      actorType: activity.actorType || ActorType.SYSTEM,
      actorId: activity.actorId || 'system',
      activityType: activity.activityType || ActivityType.CUSTOM,
      title: activity.title || 'Activity',
      content: activity.content || '',
      renderMode: activity.renderMode || RenderMode.EXPANDABLE,
      nestingLevel: activity.nestingLevel || 0,
      metadata: activity.metadata || {},
      createdAt: now,
      ...activity
    };
    
    const result = await updateCkg({
      updateType: 'createNode',
      nodeType: 'Activity',
      nodeData: completeActivity
    });
    
    if (result.status === 'error') {
      throw new Error(`Failed to create activity: ${result.error}`);
    }
    
    // Create relationships
    await this.createActivityRelationships(completeActivity);
    
    return completeActivity;
  }
  
  /**
   * Creates relationships for an activity.
   * 
   * @param activity The activity to create relationships for
   */
  private async createActivityRelationships(activity: Activity): Promise<void> {
    // Link to task if applicable
    if (activity.taskId) {
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'Activity',
        nodeId: activity.id,
        relationshipType: 'task',
        targetNodeType: 'Task',
        targetNodeId: activity.taskId
      });
      
      // Also link from Task to Activity
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'Task',
        nodeId: activity.taskId,
        relationshipType: 'activities',
        targetNodeType: 'Activity',
        targetNodeId: activity.id
      });
    }
    
    // Link to parent activity if applicable
    if (activity.parentActivityId) {
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'Activity',
        nodeId: activity.id,
        relationshipType: 'parentActivity',
        targetNodeType: 'Activity',
        targetNodeId: activity.parentActivityId
      });
      
      // Also link from parent to child
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'Activity',
        nodeId: activity.parentActivityId,
        relationshipType: 'childActivities',
        targetNodeType: 'Activity',
        targetNodeId: activity.id
      });
    }
    
    // Link to activity group if applicable
    if (activity.activityGroupId) {
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'Activity',
        nodeId: activity.id,
        relationshipType: 'activityGroup',
        targetNodeType: 'ActivityGroup',
        targetNodeId: activity.activityGroupId
      });
      
      // Also link from group to activity
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'ActivityGroup',
        nodeId: activity.activityGroupId,
        relationshipType: 'activities',
        targetNodeType: 'Activity',
        targetNodeId: activity.id
      });
    }
    
    // Link to related entities if applicable
    if (activity.relatedEntityIds && activity.relatedEntityIds.length > 0) {
      for (const entityId of activity.relatedEntityIds) {
        await updateCkg({
          updateType: 'createRelationship',
          nodeType: 'Activity',
          nodeId: activity.id,
          relationshipType: 'relatedEntities',
          targetNodeType: 'Entity', // Generic Entity interface
          targetNodeId: entityId
        });
      }
    }
    
    // Create TimePoint for this activity
    await updateCkg({
      updateType: 'createTimePoint',
      parameters: {
        entityId: activity.id,
        entityType: 'Activity',
        eventType: 'CREATION',
        timestamp: activity.timestamp,
        metadata: JSON.stringify({
          activityType: activity.activityType,
          actorType: activity.actorType
        })
      }
    });
  }
  
  /**
   * Creates a new activity group.
   * 
   * @param group Partial activity group object
   * @returns The complete stored activity group
   */
  async createActivityGroup(group: Partial<ActivityGroup>): Promise<ActivityGroup> {
    const now = new Date().toISOString();
    
    const completeGroup: ActivityGroup = {
      id: group.id || `group-${uuidv4()}`,
      title: group.title || 'Activity Group',
      startTime: group.startTime || now,
      createdAt: now,
      metadata: group.metadata || {},
      ...group
    };
    
    const result = await updateCkg({
      updateType: 'createNode',
      nodeType: 'ActivityGroup',
      nodeData: completeGroup
    });
    
    if (result.status === 'error') {
      throw new Error(`Failed to create activity group: ${result.error}`);
    }
    
    // Create relationships
    await this.createActivityGroupRelationships(completeGroup);
    
    return completeGroup;
  }
  
  /**
   * Creates relationships for an activity group.
   * 
   * @param group The activity group to create relationships for
   */
  private async createActivityGroupRelationships(group: ActivityGroup): Promise<void> {
    // Link to task if applicable
    if (group.taskId) {
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'ActivityGroup',
        nodeId: group.id!,
        relationshipType: 'task',
        targetNodeType: 'Task',
        targetNodeId: group.taskId
      });
      
      // Also link from Task to ActivityGroup
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'Task',
        nodeId: group.taskId,
        relationshipType: 'activityGroups',
        targetNodeType: 'ActivityGroup',
        targetNodeId: group.id!
      });
    }
    
    // Link to parent group if applicable
    if (group.parentGroupId) {
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'ActivityGroup',
        nodeId: group.id!,
        relationshipType: 'parentGroup',
        targetNodeType: 'ActivityGroup',
        targetNodeId: group.parentGroupId
      });
      
      // Also link from parent to child
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'ActivityGroup',
        nodeId: group.parentGroupId,
        relationshipType: 'childGroups',
        targetNodeType: 'ActivityGroup',
        targetNodeId: group.id!
      });
    }
    
    // Create TimePoint for this group
    await updateCkg({
      updateType: 'createTimePoint',
      parameters: {
        entityId: group.id!,
        entityType: 'ActivityGroup',
        eventType: 'CREATION',
        timestamp: group.startTime || group.createdAt!,
        metadata: JSON.stringify({
          groupTitle: group.title
        })
      }
    });
  }
  
  /**
   * Completes an activity group by setting its end time.
   * 
   * @param groupId The ID of the group to complete
   * @returns The updated activity group or null if not found
   */
  async completeActivityGroup(groupId: string): Promise<ActivityGroup | null> {
    const now = new Date().toISOString();
    
    // Get the current group
    const groupResult = await queryCkg({
      queryType: 'getNodeById',
      nodeType: 'ActivityGroup',
      parameters: {
        id: groupId
      }
    });
    
    if (groupResult.status === 'error' || groupResult.results.length === 0) {
      return null;
    }
    
    const group = groupResult.results[0] as ActivityGroup;
    
    // Update the group with end time
    const updateResult = await updateCkg({
      updateType: 'updateNodeProperties',
      nodeType: 'ActivityGroup',
      nodeId: groupId,
      nodeData: {
        endTime: now,
        modifiedAt: now
      }
    });
    
    if (updateResult.status === 'error') {
      throw new Error(`Failed to complete activity group: ${updateResult.error}`);
    }
    
    // Create TimePoint for completion
    await updateCkg({
      updateType: 'createTimePoint',
      parameters: {
        entityId: groupId,
        entityType: 'ActivityGroup',
        eventType: 'COMPLETION',
        timestamp: now
      }
    });
    
    return {
      ...group,
      endTime: now,
      modifiedAt: now
    };
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
    parentActivityId?: string;
    diffContent?: string;
  }): Promise<FileChangeActivity> {
    const { filePath, changeType, diffContent, ...rest } = params;
    
    // Map changeType to activityType
    let activityType: ActivityType;
    switch (changeType) {
      case 'CREATED':
        activityType = ActivityType.FILE_CREATED;
        break;
      case 'MODIFIED':
        activityType = ActivityType.FILE_MODIFIED;
        break;
      case 'DELETED':
        activityType = ActivityType.FILE_DELETED;
        break;
    }
    
    // Get file name from path
    const fileName = filePath.split('/').pop() || filePath;
    
    const activity: FileChangeActivity = {
      activityType,
      title: `${changeType.charAt(0) + changeType.slice(1).toLowerCase()} ${fileName}`,
      content: diffContent || `File ${fileName} was ${changeType.toLowerCase()}`,
      renderMode: RenderMode.EXPANDABLE,
      nestingLevel: rest.parentActivityId ? 1 : 0,
      filePath,
      changeType: changeType as FileChangeType,
      diffContent,
      relatedEntityIds: [filePath], // Add file as a related entity
      ...rest
    };
    
    // Log the activity using the generic method
    const result = await this.logActivity(activity);
    
    // Create specialized relationship to File entity if it exists
    try {
      // First, check if the file exists in the CKG
      const fileResult = await queryCkg({
        queryType: 'findNodesByLabel',
        nodeType: 'File',
        parameters: {
          label: { path: filePath }
        }
      });
      
      if (fileResult.status === 'success' && fileResult.results.length > 0) {
        const fileId = fileResult.results[0].id;
        
        // Create relationship between FileChangeActivity and File
        await updateCkg({
          updateType: 'createRelationship',
          nodeType: 'Activity',
          nodeId: result.id,
          relationshipType: 'file',
          targetNodeType: 'File',
          targetNodeId: fileId
        });
        
        // Create relationship from File to FileChangeActivity
        await updateCkg({
          updateType: 'createRelationship',
          nodeType: 'File',
          nodeId: fileId,
          relationshipType: 'fileChangeActivities',
          targetNodeType: 'Activity',
          targetNodeId: result.id
        });
      }
    } catch (error) {
      // Ignore errors when linking to file - it might not exist yet
      console.error('Error linking file change to file:', error);
    }
    
    // Properly combine the base activity with the specialized fields
    const fileChangeActivity: FileChangeActivity = {
      ...result,
      filePath,
      changeType: changeType as FileChangeType,
      diffContent
    };
    
    return fileChangeActivity;
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
      activityType: ActivityType.COMMENT,
      title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      renderMode: RenderMode.ALWAYS_EXPANDED,
      nestingLevel: rest.parentActivityId ? 1 : 0,
      mentions: mentions || [],
      hasAttachments: hasAttachments || false,
      ...rest
    };
    
    // Log the activity using the generic method
    const result = await this.logActivity(activity);
    
    // Create relationship to Agent if this is from an agent
    if (params.actorType === ActorType.AGENT) {
      try {
        // Check if the agent exists
        const agentResult = await queryCkg({
          queryType: 'getNodeById',
          nodeType: 'AgentInstance',
          parameters: {
            id: params.actorId
          }
        });
        
        if (agentResult.status === 'success' && agentResult.results.length > 0) {
          // Create relationship from AgentInstance to CommentActivity
          await updateCkg({
            updateType: 'createRelationship',
            nodeType: 'AgentInstance',
            nodeId: params.actorId,
            relationshipType: 'commentActivities',
            targetNodeType: 'Activity',
            targetNodeId: result.id
          });
        }
      } catch (error) {
        // Ignore errors when linking to agent
        console.error('Error linking comment to agent:', error);
      }
    }
    
    // Properly combine the base activity with the specialized fields
    const commentActivity: CommentActivity = {
      ...result,
      mentions: mentions || [],
      hasAttachments: hasAttachments || false
    };
    
    return commentActivity;
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
    parentActivityId?: string;
  }): Promise<CommandActivity> {
    const { command, output, exitCode, ...rest } = params;
    
    const activity: CommandActivity = {
      activityType: ActivityType.COMMAND_EXECUTED,
      title: `Executed: ${command.substring(0, 40)}${command.length > 40 ? '...' : ''}`,
      content: `Command: ${command}\nExit Code: ${exitCode}\nOutput: ${output}`,
      renderMode: RenderMode.EXPANDABLE,
      nestingLevel: rest.parentActivityId ? 1 : 0,
      command,
      output,
      exitCode,
      ...rest
    };
    
    // Log the activity using the generic method
    const result = await this.logActivity(activity);
    
    // Create relationship to Agent if this is from an agent
    if (params.actorType === ActorType.AGENT) {
      try {
        // Check if the agent exists
        const agentResult = await queryCkg({
          queryType: 'getNodeById',
          nodeType: 'AgentInstance',
          parameters: {
            id: params.actorId
          }
        });
        
        if (agentResult.status === 'success' && agentResult.results.length > 0) {
          // Create relationship from AgentInstance to CommandActivity
          await updateCkg({
            updateType: 'createRelationship',
            nodeType: 'AgentInstance',
            nodeId: params.actorId,
            relationshipType: 'commandActivities',
            targetNodeType: 'Activity',
            targetNodeId: result.id
          });
        }
      } catch (error) {
        // Ignore errors when linking to agent
        console.error('Error linking command to agent:', error);
      }
    }
    
    // Properly combine the base activity with the specialized fields
    const commandActivity: CommandActivity = {
      ...result,
      command,
      output,
      exitCode
    };
    
    return commandActivity;
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
    actorId: string;
    taskId?: string;
    activityGroupId?: string;
    parentActivityId?: string;
  }): Promise<AgentTransitionActivity> {
    const { fromRole, toRole, reason, ...rest } = params;
    
    const activity: AgentTransitionActivity = {
      actorType: ActorType.SYSTEM,
      actorId: rest.actorId,
      activityType: ActivityType.AGENT_TRANSITION,
      title: `Transition: ${fromRole} → ${toRole}`,
      content: reason,
      renderMode: RenderMode.EXPANDABLE,
      nestingLevel: rest.parentActivityId ? 1 : 0,
      fromRole,
      toRole,
      reason,
      ...rest
    };
    
    // Log the activity using the generic method
    const result = await this.logActivity(activity);
    
    // Create relationship to Agent
    try {
      // Create relationship from AgentInstance to AgentTransitionActivity
      await updateCkg({
        updateType: 'createRelationship',
        nodeType: 'AgentInstance',
        nodeId: rest.actorId,
        relationshipType: 'agentTransitionActivities',
        targetNodeType: 'Activity',
        targetNodeId: result.id
      });
    } catch (error) {
      // Ignore errors when linking to agent
      console.error('Error linking transition to agent:', error);
    }
    
    // Properly combine the base activity with the specialized fields
    const transitionActivity: AgentTransitionActivity = {
      ...result,
      fromRole,
      toRole,
      reason
    };
    
    return transitionActivity;
  }
  
  /**
   * Gets an activity by ID.
   * 
   * @param id The activity ID
   * @returns The activity or null if not found
   */
  async getActivity(id: string): Promise<Activity | null> {
    const result = await queryCkg({
      queryType: 'getNodeById',
      nodeType: 'Activity',
      parameters: {
        id
      }
    });
    
    if (result.status === 'error' || result.results.length === 0) {
      return null;
    }
    
    return result.results[0] as Activity;
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
      filterActors: undefined,
      startTime: undefined,
      endTime: undefined,
      limit: 100
    };
    
    const fullOptions = { ...defaultOptions, ...options };
    
    // Build a query using the CKG's findRelatedNodes
    const result = await queryCkg({
      queryType: 'findRelatedNodes',
      nodeType: 'Task',
      parameters: {
        nodeId: taskId,
        relationType: 'activities',
        limit: fullOptions.limit
      }
    });
    
    if (result.status === 'error' || !result.results) {
      return [];
    }
    
    let activities = result.results as Activity[];
    
    // If we don't want nested activities, filter out those with parentActivityId
    if (!fullOptions.includeNested) {
      activities = activities.filter(a => !a.parentActivityId);
    }
    
    // Apply type filters if specified
    if (fullOptions.filterTypes && fullOptions.filterTypes.length > 0) {
      activities = activities.filter(a => 
        fullOptions.filterTypes!.includes(a.activityType)
      );
    }
    
    // Apply actor filters if specified
    if (fullOptions.filterActors && fullOptions.filterActors.length > 0) {
      activities = activities.filter(a => 
        fullOptions.filterActors!.includes(a.actorType)
      );
    }
    
    // Apply time range filters if specified
    if (fullOptions.startTime) {
      const startTime = new Date(fullOptions.startTime).getTime();
      activities = activities.filter(a => 
        new Date(a.timestamp).getTime() >= startTime
      );
    }
    
    if (fullOptions.endTime) {
      const endTime = new Date(fullOptions.endTime).getTime();
      activities = activities.filter(a => 
        new Date(a.timestamp).getTime() <= endTime
      );
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
    // First, get the parent activity
    const parentResult = await this.getActivity(parentActivityId);
    if (!parentResult) {
      return [];
    }
    
    // Then, get all child activities
    const childrenResult = await queryCkg({
      queryType: 'findRelatedNodes',
      nodeType: 'Activity',
      parameters: {
        nodeId: parentActivityId,
        relationType: 'childActivities'
      }
    });
    
    const children = childrenResult.status === 'success' ? 
      (childrenResult.results as Activity[]) : [];
    
    // Combine parent and children
    const thread = [parentResult, ...children];
    
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
    // First, try to find the file entity
    const fileResult = await queryCkg({
      queryType: 'findNodesByLabel',
      nodeType: 'File',
      parameters: {
        label: { path: filePath }
      }
    });
    
    if (fileResult.status !== 'success' || fileResult.results.length === 0) {
      // File not found, try to find activities that reference this file path
      const activitiesResult = await queryCkg({
        queryType: 'keywordSearch',
        parameters: {
          types: ['Activity'],
          keywords: [filePath]
        }
      });
      
      if (activitiesResult.status !== 'success') {
        return [];
      }
      
      return activitiesResult.results as Activity[];
    }
    
    // File found, get related activities
    const fileId = fileResult.results[0].id;
    
    const relatedActivitiesResult = await queryCkg({
      queryType: 'findRelatedNodes',
      nodeType: 'File',
      parameters: {
        nodeId: fileId,
        relationType: 'fileChangeActivities'
      }
    });
    
    if (relatedActivitiesResult.status !== 'success') {
      return [];
    }
    
    const activities = relatedActivitiesResult.results as Activity[];
    
    // Sort by timestamp
    activities.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return activities;
  }
  
  /**
   * Gets all activity groups for a task.
   * 
   * @param taskId The task ID
   * @returns An array of activity groups
   */
  async getTaskActivityGroups(taskId: string): Promise<ActivityGroup[]> {
    const result = await queryCkg({
      queryType: 'findRelatedNodes',
      nodeType: 'Task',
      parameters: {
        nodeId: taskId,
        relationType: 'activityGroups'
      }
    });
    
    if (result.status !== 'success' || !result.results) {
      return [];
    }
    
    const groups = result.results as ActivityGroup[];
    
    // Sort by start time
    groups.sort((a, b) => 
      new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
    );
    
    return groups;
  }
  
  /**
   * Gets an activity group by ID.
   * 
   * @param id The activity group ID
   * @returns The activity group or null if not found
   */
  async getActivityGroup(id: string): Promise<ActivityGroup | null> {
    const result = await queryCkg({
      queryType: 'getNodeById',
      nodeType: 'ActivityGroup',
      parameters: {
        id
      }
    });
    
    if (result.status === 'error' || result.results.length === 0) {
      return null;
    }
    
    return result.results[0] as ActivityGroup;
  }
  
  /**
   * Gets activities using time-based traversal.
   * 
   * @param options Filtering options
   * @returns An array of activities
   */
  async getTimeBasedActivities(options: {
    startTime: string;
    endTime: string;
    activityTypes?: ActivityType[];
    actorTypes?: ActorType[];
    limit?: number;
  }): Promise<Activity[]> {
    // Use the findTimeRelatedEvents query
    const result = await queryCkg({
      queryType: 'findTimeRelatedEvents',
      parameters: {
        startTime: options.startTime,
        endTime: options.endTime,
        entityTypes: ['Activity'],
        limit: options.limit || 100
      }
    });
    
    if (result.status !== 'success' || !result.data) {
      return [];
    }
    
    // Define TimePoint interface for type safety
    interface TimePoint {
      entityId: string;
      timestamp: string;
      eventType: string;
      metadata?: string;
    }
    
    // The result contains TimePoints, we need to get the actual activities
    const timePoints = result.data as TimePoint[];
    const activityIds = timePoints.map((tp: TimePoint) => tp.entityId);
    
    // Get the activities by their IDs
    const activities: Activity[] = [];
    
    for (const id of activityIds) {
      const activityResult = await this.getActivity(id);
      if (activityResult) {
        // Apply filters
        if (options.activityTypes && options.activityTypes.length > 0) {
          if (!options.activityTypes.includes(activityResult.activityType)) {
            continue;
          }
        }
        
        if (options.actorTypes && options.actorTypes.length > 0) {
          if (!options.actorTypes.includes(activityResult.actorType)) {
            continue;
          }
        }
        
        activities.push(activityResult);
      }
    }
    
    // Sort by timestamp
    activities.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return activities;
  }
}

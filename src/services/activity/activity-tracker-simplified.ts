/**
 * Simplified Activity Tracker Service - CKG Implementation
 * 
 * This is a simplified version of the activity tracker that uses
 * the CKG adapter to bridge the interface gap.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Activity, ActivityGroup, ActorType, ActivityType, 
  RenderMode
} from './types-ckg.js';
import { queryCkg, updateCkg } from './ckg-adapter.js';

/**
 * Simplified service for tracking and retrieving activities using the CKG database.
 */
export class ActivityTrackerSimplified {
  /**
   * Creates a new ActivityTrackerSimplified instance.
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
    
    // Link to task if applicable
    if (completeActivity.taskId) {
      await this.createRelationship(
        'Activity', 
        completeActivity.id, 
        'task',
        'Task',
        completeActivity.taskId
      );
    }
    
    return completeActivity;
  }
  
  /**
   * Creates a relationship between two entities.
   */
  private async createRelationship(
    sourceType: string,
    sourceId: string,
    relationshipType: string,
    targetType: string,
    targetId: string
  ): Promise<void> {
    await updateCkg({
      updateType: 'createRelationship',
      nodeType: sourceType,
      nodeId: sourceId,
      relationshipType: relationshipType,
      targetNodeType: targetType,
      targetNodeId: targetId
    });
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
  }): Promise<Activity> {
    const { content, mentions, hasAttachments, ...rest } = params;
    
    const activity: Partial<Activity> = {
      activityType: ActivityType.COMMENT,
      title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      renderMode: RenderMode.ALWAYS_EXPANDED,
      nestingLevel: rest.parentActivityId ? 1 : 0,
      ...rest
    };
    
    // Log the activity using the generic method
    return await this.logActivity(activity);
  }
  
  /**
   * Gets a task timeline.
   * 
   * @param taskId The task ID
   * @returns An array of activities
   */
  async getTaskTimeline(taskId: string): Promise<Activity[]> {
    const result = await queryCkg({
      queryType: 'findRelatedNodes',
      nodeType: 'Task',
      parameters: {
        nodeId: taskId,
        relationType: 'activities'
      }
    });
    
    if (result.status !== 'success' || !result.results) {
      return [];
    }
    
    return result.results as Activity[];
  }
}

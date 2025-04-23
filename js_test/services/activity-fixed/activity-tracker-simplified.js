/**
 * Simplified activity tracker for testing
 */

import { v4 as uuidv4 } from 'uuid';
import { ActorType, ActivityType, RenderMode } from './types-ckg.js';
import { queryCkg, updateCkg } from './ckg-adapter.js';

/**
 * Simplified activity tracker
 */
export class ActivityTrackerSimplified {
  /**
   * Log a generic activity
   */
  async logActivity(activity) {
    const now = new Date().toISOString();
    
    const completeActivity = {
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
   * Create a relationship between two entities
   */
  async createRelationship(sourceType, sourceId, relationshipType, targetType, targetId) {
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
   * Log a comment activity
   */
  async logComment(params) {
    const { content, mentions, hasAttachments, ...rest } = params;
    
    const activity = {
      activityType: ActivityType.COMMENT,
      title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      renderMode: RenderMode.ALWAYS_EXPANDED,
      nestingLevel: rest.parentActivityId ? 1 : 0,
      ...rest
    };
    
    return await this.logActivity(activity);
  }
  
  /**
   * Get a task timeline
   */
  async getTaskTimeline(taskId) {
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
    
    return result.results;
  }
}

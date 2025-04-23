/**
 * Status Management Service
 * Handles task status operations with scope-aware resolution
 */

import { TaskStatusEntity, taskStatusEntitySchema } from '../types/generated/status-management-schema';
import { ScopeLevel } from '../types/generated/ckg-schema';
import { queryCKG, updateCKG } from '../tools/ckg-interaction-tools';

interface ScopeContext {
  userId?: string;
  projectId?: string;
  teamId?: string;
  orgId?: string;
}

/**
 * Service for managing task statuses with scope inheritance
 */
export class StatusManagementService {
  /**
   * Create a new task status entity
   * @param statusData Status data to create
   * @returns The created status entity ID
   */
  async createStatus(statusData: Omit<TaskStatusEntity, 'id'>): Promise<string> {
    // Validate status data
    const validatedData = taskStatusEntitySchema.parse(statusData);
    
    // Create status in CKG
    const result = await updateCKG({
      operation: 'CREATE_NODE',
      nodeType: 'TaskStatusEntity',
      data: validatedData
    });
    
    return result.nodeId;
  }
  
  /**
   * Get task status by ID
   * @param statusId Status ID to retrieve
   * @returns The task status entity
   */
  async getStatusById(statusId: string): Promise<TaskStatusEntity | null> {
    const result = await queryCKG({
      query: `
        query GetStatusById($statusId: ID!) {
          getTaskStatusEntity(id: $statusId) {
            id
            name
            description
            color
            icon
            category
            isDefault
            scope
            scopeEntityId
            isActive
            allowedTransitionsTo {
              id
              name
            }
          }
        }
      `,
      variables: { statusId }
    });
    
    return result?.getTaskStatusEntity || null;
  }
  
  /**
   * Resolve the effective status definitions for a given scope context
   * Follows the scope hierarchy: User > Project > Team > Org > Default
   * @param scopeContext The scope context to resolve for
   * @returns Object containing resolved status entities mapped by name
   */
  async resolveStatusesForScope(scopeContext: ScopeContext): Promise<Record<string, TaskStatusEntity>> {
    // Define query to find status entities at different scope levels
    // Order matters for scope resolution (most specific to most general)
    const scopeLevels: {level: ScopeLevel, entityId?: string}[] = [
      // User scope (most specific)
      scopeContext.userId ? { level: 'USER', entityId: scopeContext.userId } : null,
      // Project scope
      scopeContext.projectId ? { level: 'PROJECT', entityId: scopeContext.projectId } : null,
      // Team scope
      scopeContext.teamId ? { level: 'TEAM', entityId: scopeContext.teamId } : null,
      // Org scope
      scopeContext.orgId ? { level: 'ORG', entityId: scopeContext.orgId } : null,
      // Default scope (most general)
      { level: 'DEFAULT' }
    ].filter(Boolean);
    
    // Object to hold resolved statuses (name -> status entity)
    const resolvedStatuses: Record<string, TaskStatusEntity> = {};
    
    // Query each scope level in order (specific to general)
    for (const { level, entityId } of scopeLevels) {
      const result = await queryCKG({
        query: `
          query GetStatusesByScope($scope: ScopeLevel!, $scopeEntityId: String) {
            queryTaskStatusEntity(filter: { 
              scope: { eq: $scope },
              scopeEntityId: { eq: $scopeEntityId },
              isActive: { eq: true }
            }) {
              id
              name
              description
              color
              icon
              category
              isDefault
              scope
              scopeEntityId
              isActive
              allowedTransitionsTo {
                id
                name
              }
            }
          }
        `,
        variables: { 
          scope: level,
          scopeEntityId: entityId || null
        }
      });
      
      // Process results from this scope level
      const statusEntities = result?.queryTaskStatusEntity || [];
      for (const status of statusEntities) {
        // Only add if not already resolved at a more specific scope
        if (!resolvedStatuses[status.name]) {
          resolvedStatuses[status.name] = status;
        }
      }
    }
    
    return resolvedStatuses;
  }
  
  /**
   * Check if a status transition is allowed
   * @param fromStatusId Current status ID
   * @param toStatusId Target status ID
   * @returns Whether the transition is allowed
   */
  async isTransitionAllowed(fromStatusId: string, toStatusId: string): Promise<boolean> {
    const result = await queryCKG({
      query: `
        query CheckTransition($fromStatusId: ID!, $toStatusId: ID!) {
          getTaskStatusEntity(id: $fromStatusId) {
            allowedTransitionsTo(filter: { id: { eq: $toStatusId } }) {
              id
            }
          }
        }
      `,
      variables: { fromStatusId, toStatusId }
    });
    
    const allowedTransitions = result?.getTaskStatusEntity?.allowedTransitionsTo || [];
    return allowedTransitions.length > 0;
  }
  
  /**
   * Update a task's status
   * @param taskId Task ID to update
   * @param statusId New status ID
   * @returns Success indicator
   */
  async updateTaskStatus(taskId: string, statusId: string): Promise<boolean> {
    // First get the current task status
    const taskResult = await queryCKG({
      query: `
        query GetTaskStatus($taskId: ID!) {
          getTask(id: $taskId) {
            statusEntity {
              id
            }
          }
        }
      `,
      variables: { taskId }
    });
    
    const currentStatusId = taskResult?.getTask?.statusEntity?.id;
    
    // Skip permission check for initial status setting
    if (currentStatusId) {
      // Verify the transition is allowed
      const transitionAllowed = await this.isTransitionAllowed(currentStatusId, statusId);
      if (!transitionAllowed) {
        throw new Error(`Status transition from ${currentStatusId} to ${statusId} is not allowed`);
      }
    }
    
    // Update the task status
    const updateResult = await updateCKG({
      operation: 'UPDATE_NODE',
      nodeType: 'Task',
      nodeId: taskId,
      data: {
        statusEntity: { id: statusId }
      }
    });
    
    // Create a TimePoint for status change
    await updateCKG({
      operation: 'CREATE_NODE',
      nodeType: 'TimePoint',
      data: {
        timestamp: new Date().toISOString(),
        entityId: taskId,
        entityType: 'Task',
        eventType: 'STATUS_CHANGE',
        metadata: JSON.stringify({
          oldStatusId: currentStatusId,
          newStatusId: statusId
        })
      }
    });
    
    return updateResult.success;
  }
  
  /**
   * Get possible next statuses for a task based on current status
   * @param taskId Task ID
   * @returns Array of allowed next status entities
   */
  async getPossibleNextStatuses(taskId: string): Promise<TaskStatusEntity[]> {
    const result = await queryCKG({
      query: `
        query GetNextStatuses($taskId: ID!) {
          getTask(id: $taskId) {
            statusEntity {
              id
              allowedTransitionsTo {
                id
                name
                description
                color
                icon
                category
                isDefault
                scope
                isActive
              }
            }
          }
        }
      `,
      variables: { taskId }
    });
    
    return result?.getTask?.statusEntity?.allowedTransitionsTo || [];
  }
}

export default new StatusManagementService();

/**
 * Workflow Status Service
 * Manages the relationships between workflows and statuses
 */

import { queryCKG, updateCKG } from '../tools/ckg-interaction-tools';
import { ScopeLevel } from '../types/generated/ckg-schema';
import statusManagementService from './status-management-service';

interface WorkflowStatusConfig {
  workflowId: string;
  steps: {
    stepId: string;
    requiredStatusId?: string;
    resultingStatusId?: string;
  }[];
}

interface ScopeContext {
  userId?: string;
  projectId?: string;
  teamId?: string;
  orgId?: string;
}

/**
 * Service for managing workflow-status relationships
 */
export class WorkflowStatusService {
  /**
   * Configure status transitions for a workflow
   * @param config Workflow status configuration
   * @returns Success indicator
   */
  async configureWorkflowStatuses(config: WorkflowStatusConfig): Promise<boolean> {
    const { workflowId, steps } = config;
    
    // Update each workflow step with status references
    for (const step of steps) {
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'WorkflowStep',
        nodeId: step.stepId,
        data: {
          requiredStatus: step.requiredStatusId ? { id: step.requiredStatusId } : null,
          resultingStatus: step.resultingStatusId ? { id: step.resultingStatusId } : null
        }
      });
    }
    
    return true;
  }
  
  /**
   * Get the effective workflow for a given scope context
   * @param workflowName Workflow name to resolve
   * @param scopeContext Scope context for resolution
   * @returns Resolved workflow with its steps and associated status references
   */
  async resolveWorkflowForScope(workflowName: string, scopeContext: ScopeContext): Promise<any> {
    // Define query to find workflows at different scope levels
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
    
    // Query each scope level until workflow is found
    for (const { level, entityId } of scopeLevels) {
      const result = await queryCKG({
        query: `
          query GetWorkflowByScope($name: String!, $scope: ScopeLevel!, $scopeEntityId: String) {
            queryWorkflow(filter: { 
              name: { eq: $name },
              scope: { eq: $scope },
              isActive: { eq: true }
              AND: [
                { 
                  OR: [
                    { scopeEntityId: { eq: $scopeEntityId } },
                    { scopeEntityId: { eq: null } }
                  ]
                }
              ]
            }, first: 1) {
              id
              name
              description
              appliesToTaskType
              scope
              steps(order: { asc: stepOrder }) {
                id
                name
                description
                stepOrder
                requiredRole
                expectedSubTaskType
                isOptional
                requiredStatus {
                  id
                  name
                  color
                }
                resultingStatus {
                  id
                  name
                  color
                }
                nextStep {
                  id
                }
              }
            }
          }
        `,
        variables: { 
          name: workflowName,
          scope: level,
          scopeEntityId: entityId || null
        }
      });
      
      const workflows = result?.queryWorkflow || [];
      if (workflows.length > 0) {
        return workflows[0];
      }
    }
    
    // If no workflow found at any scope level
    return null;
  }
  
  /**
   * Get the status transition map for a workflow
   * Maps each step to its required and resulting statuses
   * @param workflowId Workflow ID
   * @returns Map of step ID to status information
   */
  async getWorkflowStatusMap(workflowId: string): Promise<Record<string, { 
    required: { id: string, name: string, color: string } | null, 
    resulting: { id: string, name: string, color: string } | null 
  }>> {
    const result = await queryCKG({
      query: `
        query GetWorkflowStatusMap($workflowId: ID!) {
          getWorkflow(id: $workflowId) {
            steps {
              id
              name
              requiredStatus {
                id
                name
                color
              }
              resultingStatus {
                id
                name
                color
              }
            }
          }
        }
      `,
      variables: { workflowId }
    });
    
    const statusMap = {};
    const steps = result?.getWorkflow?.steps || [];
    
    for (const step of steps) {
      statusMap[step.id] = {
        required: step.requiredStatus,
        resulting: step.resultingStatus
      };
    }
    
    return statusMap;
  }
  
  /**
   * Execute a workflow step and update task status accordingly
   * @param taskId Task ID
   * @param stepId Workflow step ID
   * @returns Success indicator
   */
  async executeWorkflowStep(taskId: string, stepId: string): Promise<boolean> {
    // Get workflow step
    const stepResult = await queryCKG({
      query: `
        query GetWorkflowStep($stepId: ID!) {
          getWorkflowStep(id: $stepId) {
            resultingStatus {
              id
            }
          }
        }
      `,
      variables: { stepId }
    });
    
    const resultingStatusId = stepResult?.getWorkflowStep?.resultingStatus?.id;
    
    // Update task status if resulting status is defined
    if (resultingStatusId) {
      return await statusManagementService.updateTaskStatus(taskId, resultingStatusId);
    }
    
    return true;
  }
  
  /**
   * Check if a task status is valid for executing a workflow step
   * @param taskId Task ID
   * @param stepId Workflow step ID
   * @returns Whether the task status is valid for this step
   */
  async validateTaskStatusForStep(taskId: string, stepId: string): Promise<boolean> {
    // Get current task status and workflow step required status
    const result = await queryCKG({
      query: `
        query ValidateTaskStatus($taskId: ID!, $stepId: ID!) {
          getTask(id: $taskId) {
            statusEntity {
              id
            }
          }
          getWorkflowStep(id: $stepId) {
            requiredStatus {
              id
            }
            isOptional
          }
        }
      `,
      variables: { taskId, stepId }
    });
    
    const currentStatusId = result?.getTask?.statusEntity?.id;
    const requiredStatusId = result?.getWorkflowStep?.requiredStatus?.id;
    const isOptional = result?.getWorkflowStep?.isOptional;
    
    // If step is optional or has no required status, it's always valid
    if (isOptional || !requiredStatusId) {
      return true;
    }
    
    // Otherwise, current status must match required status
    return currentStatusId === requiredStatusId;
  }
}

export default new WorkflowStatusService();

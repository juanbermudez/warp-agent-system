/**
 * Orchestrator Agent
 * Central coordinator for the Warp multi-agent system with enhanced status management
 */

import { queryCKG, updateCKG, analyzeTaskDependencies } from '../tools/ckg-interaction-tools';
import { TaskStatus, AgentRole, TaskLevel } from '../types/generated/ckg-schema';
import statusManagementService from '../services/status-management-service';
import workflowStatusService from '../services/workflow-status-service';
import { triggerHITLAlert } from '../tools/hitl-tools';

interface ScopeContext {
  userId?: string;
  projectId?: string;
  teamId?: string;
  orgId?: string;
}

/**
 * Orchestrator Agent class
 * Handles task coordination, workflow enforcement, and JIT decomposition
 * with enhanced status management capabilities
 */
export class OrchestratorAgent {
  private agentInstances: Record<string, any> = {};
  
  /**
   * Initialize the Orchestrator agent
   */
  async initialize(): Promise<void> {
    console.log('Initializing Orchestrator Agent with enhanced status management...');
    
    // Create agent instance in CKG if it doesn't exist yet
    const agentId = await this.ensureAgentInstance();
    
    // Start monitoring for tasks that need attention
    this.monitorTasks();
    
    console.log('Orchestrator Agent initialized successfully!');
  }
  
  /**
   * Ensure agent instance exists in CKG
   * @returns Agent instance ID
   */
  private async ensureAgentInstance(): Promise<string> {
    // Check if Orchestrator agent instance already exists
    const result = await queryCKG({
      query: `
        query GetOrchestratorAgent {
          queryAgentInstance(filter: { 
            role: { eq: ORCHESTRATOR },
            status: { eq: IDLE }
          }, first: 1) {
            id
          }
        }
      `
    });
    
    const existingAgents = result?.queryAgentInstance || [];
    
    if (existingAgents.length > 0) {
      return existingAgents[0].id;
    }
    
    // Create new agent instance
    const createResult = await updateCKG({
      operation: 'CREATE_NODE',
      nodeType: 'AgentInstance',
      data: {
        role: 'ORCHESTRATOR',
        status: 'IDLE',
        contextSize: 0,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        activeContext: JSON.stringify({ state: 'initialized' })
      }
    });
    
    return createResult.nodeId;
  }
  
  /**
   * Monitor for tasks that need attention
   */
  private async monitorTasks(): Promise<void> {
    console.log('Starting task monitoring...');
    
    // Set up continuous monitoring (in a real system, this would use events/webhooks)
    setInterval(async () => {
      // Look for tasks that need JIT decomposition
      await this.findTasksForDecomposition();
      
      // Look for subtasks that are ready to execute
      await this.findRunnableSubTasks();
      
      // Update agent resource allocation
      await this.manageAgentResources();
    }, 5000); // Poll every 5 seconds
  }
  
  /**
   * Find tasks that need JIT decomposition
   */
  private async findTasksForDecomposition(): Promise<void> {
    // Query for TASK-level tasks with TODO status
    const result = await queryCKG({
      query: `
        query FindTasksForDecomposition {
          queryTask(filter: { 
            taskLevel: { eq: TASK },
            status: { eq: TODO }
          }) {
            id
            title
            project {
              id
            }
            scopeContext
          }
        }
      `
    });
    
    const tasks = result?.queryTask || [];
    
    for (const task of tasks) {
      // Extract scope context
      const scopeContext = task.scopeContext ? JSON.parse(task.scopeContext) : { projectId: task.project.id };
      
      // Start JIT decomposition
      this.decomposeTask(task.id, scopeContext);
    }
  }
  
  /**
   * Decompose a task according to applicable workflow
   * @param taskId Task ID to decompose
   * @param scopeContext Scope context for resolution
   */
  private async decomposeTask(taskId: string, scopeContext: ScopeContext): Promise<void> {
    console.log(`Decomposing task ${taskId}...`);
    
    try {
      // Update task status to DECOMPOSING
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'Task',
        nodeId: taskId,
        data: { status: 'DECOMPOSING' }
      });
      
      // Get task details
      const taskResult = await queryCKG({
        query: `
          query GetTaskDetails($taskId: ID!) {
            getTask(id: $taskId) {
              title
              description
              project {
                id
              }
            }
          }
        `,
        variables: { taskId }
      });
      
      const task = taskResult?.getTask;
      
      // Find applicable workflow
      // First, check if the task has been assigned a specific workflow
      const taskWorkflowResult = await queryCKG({
        query: `
          query GetTaskWorkflow($taskId: ID!) {
            getTask(id: $taskId) {
              guidedByStep {
                workflow {
                  id
                  name
                }
              }
            }
          }
        `,
        variables: { taskId }
      });
      
      let workflow;
      
      if (taskWorkflowResult?.getTask?.guidedByStep?.workflow) {
        const workflowId = taskWorkflowResult.getTask.guidedByStep.workflow.id;
        const workflowName = taskWorkflowResult.getTask.guidedByStep.workflow.name;
        
        // Get full workflow details with status references
        const fullWorkflowResult = await queryCKG({
          query: `
            query GetFullWorkflow($workflowId: ID!) {
              getWorkflow(id: $workflowId) {
                id
                name
                description
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
                  }
                  resultingStatus {
                    id
                    name
                  }
                }
              }
            }
          `,
          variables: { workflowId }
        });
        
        workflow = fullWorkflowResult?.getWorkflow;
      } else {
        // Resolve workflow based on scope context
        workflow = await workflowStatusService.resolveWorkflowForScope('Bug Fix', scopeContext);
        
        if (!workflow) {
          console.error(`No applicable workflow found for task ${taskId}`);
          
          // Revert to TODO status
          await updateCKG({
            operation: 'UPDATE_NODE',
            nodeType: 'Task',
            nodeId: taskId,
            data: { status: 'TODO' }
          });
          
          return;
        }
      }
      
      // Use workflow to guide decomposition
      const steps = workflow.steps || [];
      
      // Update task status to AWAITING_PLAN_REVIEW
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'Task',
        nodeId: taskId,
        data: { status: 'AWAITING_PLAN_REVIEW' }
      });
      
      // Create subtasks based on workflow steps
      for (const step of steps) {
        // Create subtask based on workflow step
        const createSubTaskResult = await updateCKG({
          operation: 'CREATE_NODE',
          nodeType: 'Task',
          data: {
            title: `${step.name} for ${task.title}`,
            description: step.description || `Implement ${step.name} for ${task.title}`,
            taskLevel: 'SUBTASK',
            status: 'TODO',
            priority: 1,
            createdAt: new Date().toISOString(),
            project: { id: task.project.id },
            parentTask: { id: taskId },
            guidedByStep: { id: step.id },
            scopeContext: JSON.stringify(scopeContext)
          }
        });
        
        const subTaskId = createSubTaskResult.nodeId;
        
        // If step has a resulting status defined, update task's status entity
        if (step.resultingStatus) {
          await statusManagementService.updateTaskStatus(subTaskId, step.resultingStatus.id);
        }
      }
      
      // Analyze dependencies between subtasks
      const dependencies = await analyzeTaskDependencies(taskId);
      
      // Update subtasks with dependency relationships
      for (const [subtaskId, dependsOnIds] of Object.entries(dependencies)) {
        if (dependsOnIds.length > 0) {
          await updateCKG({
            operation: 'UPDATE_NODE',
            nodeType: 'Task',
            nodeId: subtaskId,
            data: {
              dependencies: dependsOnIds.map(id => ({ id }))
            }
          });
        }
      }
      
      // Trigger HITL review
      await triggerHITLAlert({
        type: 'PLAN_REVIEW',
        message: `Task "${task.title}" has been decomposed according to workflow "${workflow.name}". Please review the plan.`,
        relatedTaskId: taskId
      });
      
    } catch (error) {
      console.error(`Error decomposing task ${taskId}:`, error);
      
      // Update task status to ERROR
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'Task',
        nodeId: taskId,
        data: { status: 'ERROR' }
      });
    }
  }
  
  /**
   * Find subtasks that are ready to execute
   */
  private async findRunnableSubTasks(): Promise<void> {
    // Query for subtasks that are ready to run (TODO status and no unresolved dependencies)
    const result = await queryCKG({
      query: `
        query FindRunnableSubTasks {
          queryTask(filter: { 
            taskLevel: { eq: SUBTASK },
            status: { eq: TODO }
          }) {
            id
            title
            parentTask {
              id
              status
            }
            dependencies {
              id
              status
            }
            guidedByStep {
              requiredRole
            }
            scopeContext
          }
        }
      `
    });
    
    const subTasks = result?.queryTask || [];
    
    for (const subTask of subTasks) {
      // Check if parent task is in correct state
      if (subTask.parentTask.status !== 'IN_PROGRESS') {
        continue;
      }
      
      // Check if all dependencies are resolved
      const unresolved = (subTask.dependencies || []).filter(dep => dep.status !== 'DONE');
      if (unresolved.length > 0) {
        continue;
      }
      
      // Get available agent for required role
      const requiredRole = subTask.guidedByStep?.requiredRole;
      if (!requiredRole) {
        continue;
      }
      
      const availableAgent = await this.findAvailableAgent(requiredRole);
      if (!availableAgent) {
        continue;
      }
      
      // Assign subtask to agent
      await this.assignSubTaskToAgent(subTask.id, availableAgent.id, JSON.parse(subTask.scopeContext || '{}'));
    }
  }
  
  /**
   * Find an available agent for a specific role
   * @param role Required agent role
   * @returns Available agent instance or null
   */
  private async findAvailableAgent(role: AgentRole): Promise<{ id: string } | null> {
    const result = await queryCKG({
      query: `
        query FindAvailableAgent($role: AgentRole!) {
          queryAgentInstance(filter: { 
            role: { eq: $role },
            status: { eq: IDLE }
          }, first: 1) {
            id
          }
        }
      `,
      variables: { role }
    });
    
    const agents = result?.queryAgentInstance || [];
    return agents.length > 0 ? agents[0] : null;
  }
  
  /**
   * Assign a subtask to an agent
   * @param subTaskId Subtask ID
   * @param agentId Agent instance ID
   * @param scopeContext Scope context for task
   */
  private async assignSubTaskToAgent(subTaskId: string, agentId: string, scopeContext: ScopeContext): Promise<void> {
    console.log(`Assigning subtask ${subTaskId} to agent ${agentId}...`);
    
    try {
      // Update subtask
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'Task',
        nodeId: subTaskId,
        data: {
          status: 'IN_PROGRESS',
          assignedTo: { id: agentId }
        }
      });
      
      // Update agent status
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'AgentInstance',
        nodeId: agentId,
        data: {
          status: 'BUSY',
          lastActiveAt: new Date().toISOString()
        }
      });
      
      // Notify agent (in a real implementation, this would use a message queue)
      this.notifyAgent(agentId, {
        action: 'EXECUTE_TASK',
        taskId: subTaskId,
        scopeContext
      });
      
    } catch (error) {
      console.error(`Error assigning subtask ${subTaskId} to agent ${agentId}:`, error);
    }
  }
  
  /**
   * Notify an agent about an action
   * @param agentId Agent instance ID
   * @param message Message to send
   */
  private notifyAgent(agentId: string, message: any): void {
    // In a real implementation, this would use a message queue
    console.log(`Notifying agent ${agentId} with message:`, message);
    
    // For now, just store the message in agent instances map
    this.agentInstances[agentId] = this.agentInstances[agentId] || {};
    this.agentInstances[agentId].messages = this.agentInstances[agentId].messages || [];
    this.agentInstances[agentId].messages.push(message);
  }
  
  /**
   * Handle HITL response
   * @param hitlId HITL interaction ID
   * @param approved Whether the interaction was approved
   * @param message Optional message from human
   */
  async handleHITLResponse(hitlId: string, approved: boolean, message?: string): Promise<void> {
    console.log(`Handling HITL response for ${hitlId}: ${approved ? 'APPROVED' : 'REJECTED'}`);
    
    try {
      // Get HITL interaction details
      const hitlResult = await queryCKG({
        query: `
          query GetHITLDetails($hitlId: ID!) {
            getHITLInteraction(id: $hitlId) {
              type
              relatedTask {
                id
                title
                status
                taskLevel
              }
            }
          }
        `,
        variables: { hitlId }
      });
      
      const hitl = hitlResult?.getHITLInteraction;
      if (!hitl) {
        throw new Error(`HITL interaction ${hitlId} not found`);
      }
      
      const taskId = hitl.relatedTask?.id;
      if (!taskId) {
        throw new Error(`HITL interaction ${hitlId} has no related task`);
      }
      
      // Update HITL status
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'HITLInteraction',
        nodeId: hitlId,
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          respondedAt: new Date().toISOString()
        }
      });
      
      // Handle based on HITL type
      switch (hitl.type) {
        case 'PLAN_REVIEW':
          await this.handlePlanReviewResponse(taskId, approved, message);
          break;
          
        case 'COMMAND_APPROVAL':
          await this.handleCommandApprovalResponse(taskId, approved, message);
          break;
          
        case 'CODE_REVIEW':
          await this.handleCodeReviewResponse(taskId, approved, message);
          break;
          
        case 'QA_SIGNOFF':
          await this.handleQASignoffResponse(taskId, approved, message);
          break;
          
        case 'FINAL_APPROVAL':
          await this.handleFinalApprovalResponse(taskId, approved, message);
          break;
      }
      
    } catch (error) {
      console.error(`Error handling HITL response for ${hitlId}:`, error);
    }
  }
  
  /**
   * Handle plan review response
   * @param taskId Task ID
   * @param approved Whether the plan was approved
   * @param message Optional message from human
   */
  private async handlePlanReviewResponse(taskId: string, approved: boolean, message?: string): Promise<void> {
    if (approved) {
      // Update task status to IN_PROGRESS
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'Task',
        nodeId: taskId,
        data: { status: 'IN_PROGRESS' }
      });
      
      // Mark subtasks with no dependencies as ready
      const dependencyResult = await analyzeTaskDependencies(taskId);
      const readySubTasks = Object.keys(dependencyResult).filter(
        subTaskId => !dependencyResult[subTaskId] || dependencyResult[subTaskId].length === 0
      );
      
      for (const subTaskId of readySubTasks) {
        // Get the subtask's workflow step to find the appropriate status
        const subTaskResult = await queryCKG({
          query: `
            query GetSubTaskWorkflowStep($subTaskId: ID!) {
              getTask(id: $subTaskId) {
                guidedByStep {
                  id
                }
              }
            }
          `,
          variables: { subTaskId }
        });
        
        const workflowStepId = subTaskResult?.getTask?.guidedByStep?.id;
        
        // Make sure subtask status aligns with workflow requirements
        if (workflowStepId) {
          await workflowStatusService.executeWorkflowStep(subTaskId, workflowStepId);
        }
      }
      
    } else {
      // Plan rejected
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'Task',
        nodeId: taskId,
        data: { status: 'TODO' }
      });
      
      // Delete existing subtasks
      const subTasksResult = await queryCKG({
        query: `
          query GetTaskSubTasks($taskId: ID!) {
            getTask(id: $taskId) {
              childTasks {
                id
              }
            }
          }
        `,
        variables: { taskId }
      });
      
      const subTasks = subTasksResult?.getTask?.childTasks || [];
      
      for (const subTask of subTasks) {
        await updateCKG({
          operation: 'DELETE_NODE',
          nodeType: 'Task',
          nodeId: subTask.id
        });
      }
    }
  }
  
  /**
   * Handle command approval response
   * (Implementation details for other HITL response handlers would go here)
   */
  private async handleCommandApprovalResponse(taskId: string, approved: boolean, message?: string): Promise<void> {
    // Implementation would go here
  }
  
  private async handleCodeReviewResponse(taskId: string, approved: boolean, message?: string): Promise<void> {
    // Implementation would go here
  }
  
  private async handleQASignoffResponse(taskId: string, approved: boolean, message?: string): Promise<void> {
    // Implementation would go here
  }
  
  private async handleFinalApprovalResponse(taskId: string, approved: boolean, message?: string): Promise<void> {
    // Implementation would go here
  }
  
  /**
   * Manage agent resources based on workload
   */
  private async manageAgentResources(): Promise<void> {
    // Implementation would dynamically adjust agent resources
    // by spawning new agents or terminating idle ones
  }
}

export const orchestratorAgent = new OrchestratorAgent();
export default orchestratorAgent;

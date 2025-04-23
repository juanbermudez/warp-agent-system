/**
 * Analyze Task Dependencies Tool
 * 
 * This tool analyzes dependencies between tasks, considering both explicit dependencies 
 * and workflow-based dependencies, and creates an execution plan that maximizes parallelism.
 */

import { z } from 'zod';
import { GraphDatabase } from '../db/dgraph';
import { join } from 'path';
import { queryCkg } from './query-ckg.js';

// Define validation schemas
const AnalyzeTaskDependenciesInput = z.object({
  parent_task_id: z.string()
});

const TaskDependency = z.object({
  id: z.string(),
  blocked_by: z.array(z.string())
});

const AnalyzeTaskDependenciesOutput = z.object({
  task_id: z.string(),
  runnable_tasks: z.array(z.string()),
  blocked_tasks: z.array(TaskDependency),
  dependency_graph: z.record(z.array(z.string())),
  execution_plan: z.array(z.array(z.string()))
});

// Initialize the database connection
const DB_PATH = process.env.WARP_LOCAL_DB_PATH || join(process.cwd(), '.warp_memory');
const DGRAPH_URL = process.env.WARP_DGRAPH_URL || 'localhost:9080';
const graphDb = new GraphDatabase(DGRAPH_URL, DB_PATH);

/**
 * Analyzes task dependencies considering both explicit dependencies and workflow steps
 * @param input Object containing the parent task ID
 * @returns Object containing dependency analysis results
 */
export async function analyzeTaskDependencies(input: any): Promise<z.infer<typeof AnalyzeTaskDependenciesOutput>> {
  try {
    // Validate input
    const validatedInput = AnalyzeTaskDependenciesInput.parse(input);
    const parentTaskId = validatedInput.parent_task_id;

    // Initialize database if not already initialized
    await graphDb.initialize();

    // 1. Get parent task to determine its scope context
    const parentTaskResult = await queryCkg({
      queryType: 'getNodeById',
      parameters: {
        nodeType: 'Task',
        id: parentTaskId
      },
      requiredProperties: ['id', 'title', 'taskLevel', 'scopeContext']
    });

    if (!parentTaskResult.success) {
      throw new Error(`Failed to fetch parent task: ${parentTaskResult.error}`);
    }

    const parentTask = parentTaskResult.data;
    let scopeContext = {};

    // Parse scope context if available
    if (parentTask.scopeContext) {
      try {
        scopeContext = JSON.parse(parentTask.scopeContext);
      } catch (e) {
        console.warn(`Failed to parse scope context for task ${parentTaskId}`);
      }
    }

    // 2. Fetch all child tasks with their explicit dependencies
    const childTasksResult = await queryCkg({
      queryType: 'findRelatedNodes',
      parameters: {
        nodeType: 'Task',
        nodeId: parentTaskId,
        relationType: 'childTasks'
      },
      requiredProperties: ['id', 'title', 'taskLevel', 'status', 'dependencies', 'scopeContext', 'guidedByStep']
    });

    if (!childTasksResult.success) {
      throw new Error(`Failed to fetch child tasks: ${childTasksResult.error || 'No data returned'}`);
    }

    const childTasks = childTasksResult.data || [];

    // 3. Fetch applicable workflow to consider workflow-based dependencies
    const workflowResult = await queryCkg({
      queryType: 'resolveConfigByScope',
      parameters: {
        contextScope: {
          userId: scopeContext.userId,
          projectId: scopeContext.projectId,
          teamId: scopeContext.teamId,
          orgId: scopeContext.orgId
        },
        neededContext: ['workflow']
      }
    });

    // 4. Build dependency graph considering both explicit dependencies and workflow
    const dependencyGraph: Record<string, string[]> = {};

    // Initialize graph with all tasks
    childTasks.forEach(task => {
      dependencyGraph[task.id] = [];
    });

    // Add explicit dependencies
    childTasks.forEach(task => {
      if (task.dependencies && Array.isArray(task.dependencies)) {
        dependencyGraph[task.id] = task.dependencies.map(dep => dep.id);
      }
    });

    // Add workflow-based dependencies if workflow is found
    if (workflowResult.success && workflowResult.data && workflowResult.data.workflow) {
      const workflow = workflowResult.data.workflow;
      
      // Create a map of workflow steps for quick lookup
      const workflowSteps = workflow.steps || [];
      const stepMap = new Map();
      const stepOrder = new Map();
      
      workflowSteps.forEach((step, index) => {
        stepMap.set(step.id, step);
        stepOrder.set(step.id, index);
      });

      // Create a map of tasks to their workflow steps
      const taskToStepMap = new Map();
      
      childTasks.forEach(task => {
        if (task.guidedByStep) {
          taskToStepMap.set(task.id, task.guidedByStep.id);
        }
      });

      // Add workflow-based dependencies
      childTasks.forEach(task => {
        const taskStepId = taskToStepMap.get(task.id);
        
        if (taskStepId) {
          const stepIndex = stepOrder.get(taskStepId);
          
          // Find tasks that are linked to earlier workflow steps
          childTasks.forEach(otherTask => {
            const otherTaskStepId = taskToStepMap.get(otherTask.id);
            
            if (otherTaskStepId && otherTask.id !== task.id) {
              const otherStepIndex = stepOrder.get(otherTaskStepId);
              
              // If otherTask's step comes before this task's step, add a dependency
              if (otherStepIndex < stepIndex && !dependencyGraph[task.id].includes(otherTask.id)) {
                dependencyGraph[task.id].push(otherTask.id);
              }
            }
          });
        }
      });
    }

    // 5. Find runnable tasks (no dependencies)
    const runnableTasks = Object.entries(dependencyGraph)
      .filter(([_, dependencies]) => dependencies.length === 0)
      .map(([id]) => id);

    // 6. Find blocked tasks
    const blockedTasks = Object.entries(dependencyGraph)
      .filter(([_, dependencies]) => dependencies.length > 0)
      .map(([id, dependencies]) => ({
        id,
        blocked_by: dependencies
      }));

    // 7. Create execution plan
    const executionPlan = createExecutionPlan(dependencyGraph);

    return {
      task_id: parentTaskId,
      runnable_tasks: runnableTasks,
      blocked_tasks: blockedTasks,
      dependency_graph: dependencyGraph,
      execution_plan: executionPlan
    };
  } catch (error) {
    console.error('Error in analyze_task_dependencies:', error);
    throw error;
  }
}

/**
 * Create an execution plan that maximizes parallelism while respecting dependencies
 * @param dependencyGraph Dependency graph
 * @returns Execution plan with parallel batches
 */
function createExecutionPlan(dependencyGraph: Record<string, string[]>): string[][] {
  const plan: string[][] = [];
  const remainingTasks = new Set(Object.keys(dependencyGraph));
  const completedTasks = new Set<string>();
  
  // Continue until all tasks are scheduled
  while (remainingTasks.size > 0) {
    // Find tasks that can be run in parallel (all dependencies satisfied)
    const runnableTasks = Array.from(remainingTasks).filter(taskId => {
      const dependencies = dependencyGraph[taskId];
      return dependencies.every(depId => completedTasks.has(depId));
    });
    
    // If no runnable tasks but we still have remaining tasks, we have a cycle
    if (runnableTasks.length === 0) {
      console.error('Cyclic dependency detected in tasks');
      break;
    }
    
    // Add the parallel batch to the plan
    plan.push(runnableTasks);
    
    // Mark these tasks as completed
    runnableTasks.forEach(taskId => {
      completedTasks.add(taskId);
      remainingTasks.delete(taskId);
    });
  }
  
  return plan;
}

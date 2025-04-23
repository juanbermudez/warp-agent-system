/**
 * Populate Status Entities Script
 * Creates default task status entities and configures workflows
 */

import { updateCKG } from '../tools/ckg-interaction-tools';
import statusManagementService from '../services/status-management-service';
import workflowStatusService from '../services/workflow-status-service';

/**
 * Populate default task status entities
 */
async function populateDefaultStatuses() {
  console.log('Populating default task status entities...');
  
  // Create default status entities
  const statuses = [
    {
      name: 'Backlog',
      description: 'Task is in the backlog, not actively being worked on',
      color: '#6B7280',
      icon: 'inbox',
      category: 'planning',
      isDefault: true,
      scope: 'DEFAULT',
      isActive: true
    },
    {
      name: 'Todo',
      description: 'Task is ready to be started',
      color: '#3B82F6',
      icon: 'list-check',
      category: 'planning',
      isDefault: false,
      scope: 'DEFAULT',
      isActive: true
    },
    {
      name: 'In Progress',
      description: 'Task is actively being worked on',
      color: '#10B981',
      icon: 'play',
      category: 'development',
      isDefault: false,
      scope: 'DEFAULT',
      isActive: true
    },
    {
      name: 'In Review',
      description: 'Task is completed and awaiting review',
      color: '#F59E0B',
      icon: 'eye',
      category: 'review',
      isDefault: false,
      scope: 'DEFAULT',
      isActive: true
    },
    {
      name: 'Done',
      description: 'Task is completed and approved',
      color: '#059669',
      icon: 'check-circle',
      category: 'completed',
      isDefault: false,
      scope: 'DEFAULT',
      isActive: true
    },
    {
      name: 'Blocked',
      description: 'Task is blocked by an external dependency',
      color: '#EF4444',
      icon: 'x-circle',
      category: 'blocked',
      isDefault: false,
      scope: 'DEFAULT',
      isActive: true
    }
  ];
  
  // Create each status entity
  const statusIds = {};
  
  for (const status of statuses) {
    try {
      const statusId = await statusManagementService.createStatus(status);
      statusIds[status.name] = statusId;
      console.log(`Created status: ${status.name} (${statusId})`);
    } catch (error) {
      console.error(`Error creating status ${status.name}:`, error);
    }
  }
  
  // Configure transitions between statuses
  for (const [fromStatus, toStatuses] of Object.entries({
    'Backlog': ['Todo'],
    'Todo': ['In Progress', 'Blocked'],
    'In Progress': ['In Review', 'Blocked'],
    'In Review': ['Done', 'In Progress', 'Blocked'],
    'Blocked': ['Todo', 'In Progress'],
    'Done': ['Backlog'] // Allow reopening completed tasks
  })) {
    try {
      const fromId = statusIds[fromStatus];
      const toIds = toStatuses.map(name => statusIds[name]);
      
      for (const toId of toIds) {
        await updateCKG({
          operation: 'UPDATE_NODE',
          nodeType: 'TaskStatusEntity',
          nodeId: fromId,
          data: {
            allowedTransitionsTo: [{ id: toId }]
          }
        });
      }
      
      console.log(`Configured transitions for ${fromStatus}`);
    } catch (error) {
      console.error(`Error configuring transitions for ${fromStatus}:`, error);
    }
  }
  
  return statusIds;
}

/**
 * Create a sample workflow with status transitions
 * @param statusIds Map of status names to IDs
 */
async function createSampleWorkflow(statusIds: Record<string, string>) {
  console.log('Creating sample bug fix workflow...');
  
  try {
    // Create the workflow
    const workflowResult = await updateCKG({
      operation: 'CREATE_NODE',
      nodeType: 'Workflow',
      data: {
        name: 'Bug Fix',
        description: 'Standard workflow for fixing bugs',
        appliesToTaskType: 'TASK',
        scope: 'DEFAULT',
        isActive: true,
        version: '1.0'
      }
    });
    
    const workflowId = workflowResult.nodeId;
    
    // Create workflow steps
    const steps = [
      {
        name: 'Reproduce Bug',
        description: 'Verify and document steps to reproduce the bug',
        stepOrder: 1,
        requiredRole: 'QA_TESTER',
        expectedSubTaskType: 'TEST',
        isOptional: false,
        requiredStatusId: statusIds['Todo'],
        resultingStatusId: statusIds['In Progress']
      },
      {
        name: 'Root Cause Analysis',
        description: 'Analyze code to determine the cause of the bug',
        stepOrder: 2,
        requiredRole: 'BACKEND_ENGINEER',
        expectedSubTaskType: 'CODE',
        isOptional: false,
        requiredStatusId: statusIds['In Progress'],
        resultingStatusId: statusIds['In Progress']
      },
      {
        name: 'Fix Implementation',
        description: 'Implement the fix for the bug',
        stepOrder: 3,
        requiredRole: 'BACKEND_ENGINEER',
        expectedSubTaskType: 'CODE',
        isOptional: false,
        requiredStatusId: statusIds['In Progress'],
        resultingStatusId: statusIds['In Progress']
      },
      {
        name: 'Fix Testing',
        description: 'Test the implemented fix',
        stepOrder: 4,
        requiredRole: 'QA_TESTER',
        expectedSubTaskType: 'TEST',
        isOptional: false,
        requiredStatusId: statusIds['In Progress'],
        resultingStatusId: statusIds['In Review']
      },
      {
        name: 'Code Review',
        description: 'Review the code changes',
        stepOrder: 5,
        requiredRole: 'BACKEND_ENGINEER',
        expectedSubTaskType: 'REVIEW',
        isOptional: false,
        requiredStatusId: statusIds['In Review'],
        resultingStatusId: statusIds['Done']
      }
    ];
    
    const stepIds = {};
    
    // Create each step
    for (const step of steps) {
      const stepResult = await updateCKG({
        operation: 'CREATE_NODE',
        nodeType: 'WorkflowStep',
        data: {
          name: step.name,
          description: step.description,
          stepOrder: step.stepOrder,
          workflow: { id: workflowId },
          requiredRole: step.requiredRole,
          expectedSubTaskType: step.expectedSubTaskType,
          isOptional: step.isOptional
        }
      });
      
      const stepId = stepResult.nodeId;
      stepIds[step.name] = stepId;
      
      console.log(`Created workflow step: ${step.name} (${stepId})`);
    }
    
    // Configure step sequence
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'WorkflowStep',
        nodeId: stepIds[currentStep.name],
        data: {
          nextStep: { id: stepIds[nextStep.name] }
        }
      });
      
      await updateCKG({
        operation: 'UPDATE_NODE',
        nodeType: 'WorkflowStep',
        nodeId: stepIds[nextStep.name],
        data: {
          previousStep: { id: stepIds[currentStep.name] }
        }
      });
    }
    
    // Configure workflow status transitions
    const stepConfig = steps.map(step => ({
      stepId: stepIds[step.name],
      requiredStatusId: step.requiredStatusId,
      resultingStatusId: step.resultingStatusId
    }));
    
    await workflowStatusService.configureWorkflowStatuses({
      workflowId,
      steps: stepConfig
    });
    
    console.log(`Successfully configured Bug Fix workflow with status transitions!`);
    
  } catch (error) {
    console.error('Error creating sample workflow:', error);
  }
}

/**
 * Create project-specific status overrides
 * @param projectId Project ID
 * @param statusIds Default status IDs
 */
async function createProjectSpecificStatuses(projectId: string, statusIds: Record<string, string>) {
  console.log(`Creating project-specific statuses for project ${projectId}...`);
  
  try {
    // Create a project-specific status override
    const securityReviewStatusId = await statusManagementService.createStatus({
      name: 'Security Review',
      description: 'Task requires security review before completion',
      color: '#9333EA',
      icon: 'shield',
      category: 'review',
      isDefault: false,
      scope: 'PROJECT',
      scopeEntityId: projectId,
      isActive: true
    });
    
    console.log(`Created project-specific Security Review status (${securityReviewStatusId})`);
    
    // Configure transitions for new status
    // In Review -> Security Review -> Done
    await updateCKG({
      operation: 'UPDATE_NODE',
      nodeType: 'TaskStatusEntity',
      nodeId: statusIds['In Review'],
      data: {
        allowedTransitionsTo: [{ id: securityReviewStatusId }]
      }
    });
    
    await updateCKG({
      operation: 'UPDATE_NODE',
      nodeType: 'TaskStatusEntity',
      nodeId: securityReviewStatusId,
      data: {
        allowedTransitionsTo: [{ id: statusIds['Done'] }]
      }
    });
    
    console.log('Configured transitions for project-specific status');
    
    // Create project-specific Bug Fix workflow
    const workflowResult = await updateCKG({
      operation: 'CREATE_NODE',
      nodeType: 'Workflow',
      data: {
        name: 'Bug Fix',
        description: 'Project-specific workflow for fixing bugs with security review',
        appliesToTaskType: 'TASK',
        scope: 'PROJECT',
        scopeEntityId: projectId,
        isActive: true,
        version: '1.1',
        appliesTo: [{ id: projectId }]
      }
    });
    
    const projectWorkflowId = workflowResult.nodeId;
    
    // Copy the default steps but add a security review step
    // This would be more complex in a real implementation
    console.log(`Created project-specific Bug Fix workflow (${projectWorkflowId})`);
    
    return securityReviewStatusId;
  } catch (error) {
    console.error(`Error creating project-specific statuses:`, error);
    return null;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Populate default statuses
    const statusIds = await populateDefaultStatuses();
    
    // Create sample workflow
    await createSampleWorkflow(statusIds);
    
    // Get or create a sample project
    let projectId = null;
    
    const projectResult = await updateCKG({
      operation: 'CREATE_NODE',
      nodeType: 'Project',
      data: {
        name: 'Sample Project',
        description: 'A sample project for testing',
        rootPath: '/sample',
        createdAt: new Date().toISOString()
      }
    });
    
    projectId = projectResult.nodeId;
    
    // Create project-specific statuses
    if (projectId) {
      await createProjectSpecificStatuses(projectId, statusIds);
    }
    
    console.log('Status entity population completed successfully!');
  } catch (error) {
    console.error('Error populating status entities:', error);
  }
}

// Run script if executed directly
if (require.main === module) {
  main();
}

export { populateDefaultStatuses, createSampleWorkflow, createProjectSpecificStatuses };

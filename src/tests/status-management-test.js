/**
 * Status Management Integration Test
 * Tests the enhanced task status management functionality
 */

import statusManagementService from '../services/status-management-service';
import workflowStatusService from '../services/workflow-status-service';
import { orchestratorAgent } from '../agents/orchestrator-agent';
import { queryCKG, updateCKG } from '../tools/ckg-interaction-tools';
import { populateDefaultStatuses } from '../scripts/populate-status-entities';

/**
 * Test the full status management flow
 */
async function testStatusManagement() {
  console.log('===== TESTING STATUS MANAGEMENT =====');
  
  try {
    // 1. Set up test data
    console.log('\n1. Setting up test data...');
    
    // Populate default statuses
    const statusIds = await populateDefaultStatuses();
    console.log('Default statuses created with IDs:', statusIds);
    
    // Create a test project
    const projectResult = await updateCKG({
      operation: 'CREATE_NODE',
      nodeType: 'Project',
      data: {
        name: 'Test Project',
        description: 'Project for testing status management',
        rootPath: '/test',
        createdAt: new Date().toISOString()
      }
    });
    
    const projectId = projectResult.nodeId;
    console.log(`Test project created with ID: ${projectId}`);
    
    // Create project-specific status
    const highPriorityStatusResult = await statusManagementService.createStatus({
      name: 'High Priority',
      description: 'Task requires immediate attention',
      color: '#DC2626',
      icon: 'alert-triangle',
      category: 'priority',
      isDefault: false,
      scope: 'PROJECT',
      scopeEntityId: projectId,
      isActive: true,
      appliesTo: [{ id: projectId }]
    });
    
    console.log(`Project-specific status created with ID: ${highPriorityStatusResult}`);
    
    // 2. Test scope resolution
    console.log('\n2. Testing scope resolution...');
    
    // Create scope context
    const scopeContext = {
      projectId,
      userId: 'test-user-123', // Hypothetical
      teamId: 'test-team-123', // Hypothetical
      orgId: 'test-org-123'    // Hypothetical
    };
    
    // Resolve statuses for scope
    const resolvedStatuses = await statusManagementService.resolveStatusesForScope(scopeContext);
    console.log('Resolved statuses for scope:', Object.keys(resolvedStatuses));
    
    // Verify project-specific status is included
    if (resolvedStatuses['High Priority']) {
      console.log('✅ Project-specific status was correctly resolved');
    } else {
      console.log('❌ Project-specific status was not resolved');
    }
    
    // 3. Test task status assignment
    console.log('\n3. Testing task status assignment...');
    
    // Create a test task
    const taskResult = await updateCKG({
      operation: 'CREATE_NODE',
      nodeType: 'Task',
      data: {
        title: 'Test Bug Fix',
        description: 'A test bug that needs fixing',
        taskLevel: 'TASK',
        status: 'TODO',
        priority: 1,
        createdAt: new Date().toISOString(),
        project: { id: projectId },
        scopeContext: JSON.stringify(scopeContext)
      }
    });
    
    const taskId = taskResult.nodeId;
    console.log(`Test task created with ID: ${taskId}`);
    
    // Assign a status to the task
    const todoStatusId = Object.entries(statusIds).find(([name]) => name === 'Todo')?.[1];
    
    if (todoStatusId) {
      await statusManagementService.updateTaskStatus(taskId, todoStatusId);
      console.log(`Assigned 'Todo' status to task`);
      
      // Verify status assignment
      const taskStatusResult = await queryCKG({
        query: `
          query GetTaskStatus($taskId: ID!) {
            getTask(id: $taskId) {
              statusEntity {
                id
                name
              }
            }
          }
        `,
        variables: { taskId }
      });
      
      const assignedStatus = taskStatusResult?.getTask?.statusEntity;
      console.log(`Task status is now: ${assignedStatus?.name}`);
    } else {
      console.log('❌ Could not find Todo status ID');
    }
    
    // 4. Test status transitions
    console.log('\n4. Testing status transitions...');
    
    // Get In Progress status
    const inProgressStatusId = Object.entries(statusIds).find(([name]) => name === 'In Progress')?.[1];
    
    if (todoStatusId && inProgressStatusId) {
      // Check if transition is allowed
      const transitionAllowed = await statusManagementService.isTransitionAllowed(
        todoStatusId,
        inProgressStatusId
      );
      
      console.log(`Transition from Todo to In Progress allowed: ${transitionAllowed}`);
      
      if (transitionAllowed) {
        // Perform transition
        await statusManagementService.updateTaskStatus(taskId, inProgressStatusId);
        console.log('Transitioned task to In Progress');
        
        // Get possible next statuses
        const nextStatuses = await statusManagementService.getPossibleNextStatuses(taskId);
        console.log('Possible next statuses:', nextStatuses.map(s => s.name).join(', '));
      }
    }
    
    // 5. Initialize Orchestrator and test workflow-driven decomposition
    console.log('\n5. Testing Orchestrator integration...');
    
    // Initialize Orchestrator agent
    await orchestratorAgent.initialize();
    console.log('Orchestrator agent initialized');
    
    // This would trigger the Orchestrator's task decomposition in a real deployment
    console.log('In a production system, the Orchestrator would now:');
    console.log('1. Detect the task is ready for decomposition');
    console.log('2. Resolve the applicable workflow based on scope');
    console.log('3. Decompose the task according to workflow steps');
    console.log('4. Apply appropriate status transitions');
    console.log('5. Manage HITL checkpoints');
    
    console.log('\n===== STATUS MANAGEMENT TEST COMPLETED =====');
    
  } catch (error) {
    console.error('Error during status management test:', error);
  }
}

// Run test if executed directly
if (require.main === module) {
  testStatusManagement();
}

export { testStatusManagement };

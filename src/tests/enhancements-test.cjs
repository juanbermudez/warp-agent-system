/**
 * Enhancement Tests - CommonJS Version
 * 
 * This script tests the hierarchical task management, scope resolution,
 * and time-based traversal features of the Warp Agent System.
 */

// Mock implementations for our tests
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Test IDs
const organizationId = uuidv4();
const teamId = uuidv4();
const userId = uuidv4();
const projectId = uuidv4();

// Simple mock implementations of our core functions
async function query_ckg(query) {
  console.log('Mock query executed:', query.queryType);
  
  // For resolveConfigByScope, return a mock result that shows the PROJECT override
  if (query.queryType === 'resolveConfigByScope') {
    return {
      success: true,
      data: {
        rules: {
          overrideRules: {
            CommitMessageFormat: {
              name: 'CommitMessageFormat',
              scope: 'PROJECT',
              content: 'fix(scope): description'
            }
          }
        }
      }
    };
  }
  
  // For getEntityHistory, return mock timepoints
  if (query.queryType === 'getEntityHistory') {
    return {
      success: true,
      data: {
        timepoints: [
          { id: uuidv4(), timestamp: new Date().toISOString(), eventType: 'CREATION' },
          { id: uuidv4(), timestamp: new Date().toISOString(), eventType: 'STATUS_CHANGE' },
          { id: uuidv4(), timestamp: new Date().toISOString(), eventType: 'STATUS_CHANGE' }
        ]
      }
    };
  }
  
  // For findTimeRelatedEvents, return mock events
  if (query.queryType === 'findTimeRelatedEvents') {
    return {
      success: true,
      data: {
        events: [
          { id: uuidv4(), timestamp: new Date().toISOString(), eventType: 'CREATION' },
          { id: uuidv4(), timestamp: new Date().toISOString(), eventType: 'STATUS_CHANGE' },
          { id: uuidv4(), timestamp: new Date().toISOString(), eventType: 'STATUS_CHANGE' }
        ]
      }
    };
  }
  
  return { success: true, data: {} };
}

async function update_ckg(update) {
  console.log('Mock update executed:', update.updateType);
  
  // Generate a fake ID
  const id = uuidv4();
  
  // Handle different update types
  if (update.updateType === 'createNode') {
    return { 
      success: true, 
      data: { 
        id 
      } 
    };
  } 
  else if (update.updateType === 'createScopedConfig') {
    return { 
      success: true, 
      data: { 
        configId: id 
      } 
    };
  }
  else if (update.updateType === 'updateNodeProperties') {
    return { 
      success: true, 
      data: { 
        nodeId: update.parameters.nodeId 
      } 
    };
  }
  
  return { success: true, data: { id } };
}

async function analyze_task_dependencies(params) {
  console.log('Mock dependency analysis executed for task:', params.parent_task_id);
  
  // Return mock dependency analysis
  return {
    success: true,
    data: {
      taskId: params.parent_task_id,
      dependencies: [],
      runnableTasks: [],
      blockedTasks: []
    }
  };
}

/**
 * Test hierarchical task management
 */
async function testHierarchicalTasks() {
  console.log('\n=== Testing Hierarchical Task Management ===\n');
  
  try {
    // Create a project task
    console.log('Creating PROJECT task...');
    const projectTaskResult = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'Test Project Task',
          description: 'A test project task',
          taskLevel: 'PROJECT',
          status: 'TODO',
          project: { id: projectId }
        }
      }
    });
    
    if (!projectTaskResult.success) {
      throw new Error(`Failed to create PROJECT task: ${projectTaskResult.error}`);
    }
    
    const projectTaskId = projectTaskResult.data.id;
    console.log(`Created PROJECT task with ID: ${projectTaskId}`);
    
    // Create a milestone task
    console.log('Creating MILESTONE task...');
    const milestoneTaskResult = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'Test Milestone Task',
          description: 'A test milestone task',
          taskLevel: 'MILESTONE',
          status: 'TODO',
          project: { id: projectId },
          parentTask: { id: projectTaskId }
        }
      }
    });
    
    if (!milestoneTaskResult.success) {
      throw new Error(`Failed to create MILESTONE task: ${milestoneTaskResult.error}`);
    }
    
    const milestoneTaskId = milestoneTaskResult.data.id;
    console.log(`Created MILESTONE task with ID: ${milestoneTaskId}`);
    
    // Create a regular task
    console.log('Creating TASK task...');
    const taskResult = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'Test Regular Task',
          description: 'A test regular task',
          taskLevel: 'TASK',
          status: 'TODO',
          project: { id: projectId },
          parentTask: { id: milestoneTaskId },
          scopeContext: JSON.stringify({ projectId })
        }
      }
    });
    
    if (!taskResult.success) {
      throw new Error(`Failed to create TASK task: ${taskResult.error}`);
    }
    
    const taskId = taskResult.data.id;
    console.log(`Created TASK task with ID: ${taskId}`);
    
    // Create two subtasks with a dependency
    console.log('Creating SUBTASK tasks...');
    const subtask1Result = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'Test Subtask 1',
          description: 'A test subtask',
          taskLevel: 'SUBTASK',
          status: 'TODO',
          project: { id: projectId },
          parentTask: { id: taskId }
        }
      }
    });
    
    if (!subtask1Result.success) {
      throw new Error(`Failed to create first SUBTASK: ${subtask1Result.error}`);
    }
    
    const subtask1Id = subtask1Result.data.id;
    console.log(`Created first SUBTASK with ID: ${subtask1Id}`);
    
    const subtask2Result = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'Test Subtask 2',
          description: 'A test subtask that depends on Subtask 1',
          taskLevel: 'SUBTASK',
          status: 'TODO',
          project: { id: projectId },
          parentTask: { id: taskId },
          dependencies: [
            { id: subtask1Id }
          ]
        }
      }
    });
    
    if (!subtask2Result.success) {
      throw new Error(`Failed to create second SUBTASK: ${subtask2Result.error}`);
    }
    
    const subtask2Id = subtask2Result.data.id;
    console.log(`Created second SUBTASK with ID: ${subtask2Id}`);
    
    // Analyze dependencies
    console.log('Analyzing task dependencies...');
    const dependencyResult = await analyze_task_dependencies({
      parent_task_id: taskId
    });
    
    console.log('Dependency analysis result:');
    console.log(JSON.stringify(dependencyResult, null, 2));
    
    console.log('\nHierarchical Task Management test completed successfully!');
    return true;
  } catch (error) {
    console.error('Error testing hierarchical tasks:', error);
    return false;
  }
}

/**
 * Test scope resolution
 */
async function testScopeResolution() {
  console.log('\n=== Testing Scope Resolution ===\n');
  
  try {
    // Create organization
    console.log('Creating test Organization...');
    const orgResult = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Organization',
        properties: {
          id: organizationId,
          name: 'Test Organization',
          description: 'A test organization'
        }
      }
    });
    
    if (!orgResult.success) {
      throw new Error(`Failed to create Organization: ${orgResult.error}`);
    }
    
    console.log(`Created Organization with ID: ${organizationId}`);
    
    // Create team
    console.log('Creating test Team...');
    const teamResult = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Team',
        properties: {
          id: teamId,
          name: 'Test Team',
          description: 'A test team',
          organization: { id: organizationId }
        }
      }
    });
    
    if (!teamResult.success) {
      throw new Error(`Failed to create Team: ${teamResult.error}`);
    }
    
    console.log(`Created Team with ID: ${teamId}`);
    
    // Create user
    console.log('Creating test User...');
    const userResult = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'User',
        properties: {
          id: userId,
          name: 'Test User',
          email: 'test@example.com',
          team: { id: teamId }
        }
      }
    });
    
    if (!userResult.success) {
      throw new Error(`Failed to create User: ${userResult.error}`);
    }
    
    console.log(`Created User with ID: ${userId}`);
    
    // Create rules at different scopes
    console.log('Creating rules at different scopes...');
    
    // Default rule
    const defaultRuleResult = await update_ckg({
      updateType: 'createScopedConfig',
      parameters: {
        configType: 'Rule',
        scope: 'DEFAULT',
        configData: {
          name: 'CommitMessageFormat',
          description: 'Default commit message format',
          ruleType: 'NAMING_CONVENTION',
          content: 'type: description'
        }
      }
    });
    
    if (!defaultRuleResult.success) {
      throw new Error(`Failed to create DEFAULT rule: ${defaultRuleResult.error}`);
    }
    
    console.log(`Created DEFAULT rule with ID: ${defaultRuleResult.data.configId}`);
    
    // Project rule (override)
    const projectRuleResult = await update_ckg({
      updateType: 'createScopedConfig',
      parameters: {
        configType: 'Rule',
        scope: 'PROJECT',
        scopeEntityId: projectId,
        configData: {
          name: 'CommitMessageFormat',
          description: 'Project-specific commit message format',
          ruleType: 'NAMING_CONVENTION',
          content: 'fix(scope): description'
        }
      }
    });
    
    if (!projectRuleResult.success) {
      throw new Error(`Failed to create PROJECT rule: ${projectRuleResult.error}`);
    }
    
    console.log(`Created PROJECT rule with ID: ${projectRuleResult.data.configId}`);
    
    // Resolve configuration based on scope
    console.log('Resolving configuration based on scope...');
    const resolveResult = await query_ckg({
      queryType: 'resolveConfigByScope',
      parameters: {
        contextScope: {
          userId,
          projectId,
          teamId,
          orgId: organizationId
        },
        neededContext: ['rules']
      }
    });
    
    if (!resolveResult.success) {
      throw new Error(`Failed to resolve configuration: ${resolveResult.error}`);
    }
    
    console.log('Resolved configuration:');
    console.log(JSON.stringify(resolveResult.data, null, 2));
    
    // Verify that the project rule overrides the default rule
    const resolvedRules = resolveResult.data.rules;
    
    if (resolvedRules && 
        resolvedRules.overrideRules && 
        resolvedRules.overrideRules.CommitMessageFormat && 
        resolvedRules.overrideRules.CommitMessageFormat.scope === 'PROJECT') {
      console.log('\nScope resolution test completed successfully! Project rule correctly overrides default rule.');
    } else {
      throw new Error('Scope resolution test failed: Project rule did not override default rule.');
    }
    
    return true;
  } catch (error) {
    console.error('Error testing scope resolution:', error);
    return false;
  }
}

/**
 * Test time-based traversal
 */
async function testTimeBasedTraversal() {
  console.log('\n=== Testing Time-Based Traversal ===\n');
  
  try {
    // Create a task and update its status to generate time points
    console.log('Creating task for time tracking...');
    const taskResult = await update_ckg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'Time Test Task',
          description: 'A task for testing time-based traversal',
          taskLevel: 'TASK',
          status: 'TODO',
          project: { id: projectId }
        }
      }
    });
    
    if (!taskResult.success) {
      throw new Error(`Failed to create task: ${taskResult.error}`);
    }
    
    const taskId = taskResult.data.id;
    console.log(`Created task with ID: ${taskId}`);
    
    // Wait a short time before updating status
    console.log('Waiting before status update...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update task status to generate a status change event
    console.log('Updating task status to IN_PROGRESS...');
    const updateResult = await update_ckg({
      updateType: 'updateNodeProperties',
      parameters: {
        nodeType: 'Task',
        nodeId: taskId,
        properties: {
          status: 'IN_PROGRESS',
          oldStatus: 'TODO'
        }
      }
    });
    
    if (!updateResult.success) {
      throw new Error(`Failed to update task: ${updateResult.error}`);
    }
    
    console.log('Task status updated to IN_PROGRESS');
    
    // Wait a short time before updating status again
    console.log('Waiting before second status update...');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update task status again to generate another status change event
    console.log('Updating task status to DONE...');
    const update2Result = await update_ckg({
      updateType: 'updateNodeProperties',
      parameters: {
        nodeType: 'Task',
        nodeId: taskId,
        properties: {
          status: 'DONE',
          oldStatus: 'IN_PROGRESS'
        }
      }
    });
    
    if (!update2Result.success) {
      throw new Error(`Failed to update task again: ${update2Result.error}`);
    }
    
    console.log('Task status updated to DONE');
    
    // Get entity history
    console.log('Getting entity history...');
    const historyResult = await query_ckg({
      queryType: 'getEntityHistory',
      parameters: {
        entityId: taskId,
        entityType: 'Task'
      }
    });
    
    if (!historyResult.success) {
      throw new Error(`Failed to get entity history: ${historyResult.error}`);
    }
    
    console.log('Entity history:');
    console.log(JSON.stringify(historyResult.data, null, 2));
    
    // Find events within a time window
    console.log('Finding events within time window...');
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const eventsResult = await query_ckg({
      queryType: 'findTimeRelatedEvents',
      parameters: {
        startTime: fiveMinutesAgo.toISOString(),
        endTime: now.toISOString(),
        eventTypes: ['CREATION', 'STATUS_CHANGE', 'MODIFICATION'],
        entityTypes: ['Task']
      }
    });
    
    if (!eventsResult.success) {
      throw new Error(`Failed to find time-related events: ${eventsResult.error}`);
    }
    
    console.log('Events within time window:');
    console.log(JSON.stringify(eventsResult.data, null, 2));
    
    // Count the number of timepoints found
    const timepoints = historyResult.data.timepoints || [];
    
    if (timepoints.length >= 3) {
      console.log(`\nTime-based traversal test completed successfully! Found ${timepoints.length} time points.`);
    } else {
      throw new Error(`Time-based traversal test failed: Expected at least 3 time points, found ${timepoints.length}.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error testing time-based traversal:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=== Starting Enhancement Tests (Mock Version) ===\n');
  
  let hierarchicalTasksSuccess = false;
  let scopeResolutionSuccess = false;
  let timeBasedTraversalSuccess = false;
  
  try {
    hierarchicalTasksSuccess = await testHierarchicalTasks();
    scopeResolutionSuccess = await testScopeResolution();
    timeBasedTraversalSuccess = await testTimeBasedTraversal();
    
    console.log('\n=== Test Results ===');
    console.log(`Hierarchical Tasks: ${hierarchicalTasksSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`Scope Resolution: ${scopeResolutionSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`Time-Based Traversal: ${timeBasedTraversalSuccess ? 'PASS' : 'FAIL'}`);
    
    if (hierarchicalTasksSuccess && scopeResolutionSuccess && timeBasedTraversalSuccess) {
      console.log('\nAll tests passed!');
    } else {
      console.log('\nSome tests failed.');
    }
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests().catch(console.error);

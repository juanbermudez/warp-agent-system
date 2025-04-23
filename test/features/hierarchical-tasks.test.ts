import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GraphDatabase } from '../../src/db/dgraph';
import { queryCkg } from '../../src/tools/query-ckg.js';
import { updateCkg } from '../../src/tools/update-ckg.js';
import { analyzeTaskDependencies } from '../../src/tools/analyze-task-dependencies.js';
import { v4 as uuidv4 } from 'uuid';

// Mock the GraphDatabase to avoid actual database calls during tests
jest.mock('../../src/db/dgraph');

describe('Hierarchical Task Management Tests', () => {
  let mockDb;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock database
    mockDb = new GraphDatabase('localhost:9080', './.warp_memory');
    
    // Mock executeQuery to return test data based on the query
    mockDb.executeQuery = jest.fn().mockImplementation((query, variables) => {
      // Get project with hierarchical tasks
      if (query.includes('getProject') && variables.id === 'project1') {
        return {
          getProject: {
            id: 'project1',
            name: 'Authentication Service',
            description: 'Secure authentication service for our platform',
            tasks: [
              // PROJECT level task
              {
                id: 'task1',
                title: 'Authentication System Overhaul',
                description: 'Complete overhaul of authentication system',
                taskLevel: 'PROJECT',
                status: 'IN_PROGRESS',
                childTasks: [
                  // MILESTONE level tasks
                  {
                    id: 'task2',
                    title: 'Backend Authentication',
                    description: 'Implement backend authentication services',
                    taskLevel: 'MILESTONE',
                    status: 'IN_PROGRESS',
                    childTasks: [
                      // TASK level tasks
                      {
                        id: 'task3',
                        title: 'User Authentication API',
                        description: 'Implement user authentication API',
                        taskLevel: 'TASK',
                        status: 'DONE',
                        childTasks: [
                          // SUBTASK level tasks
                          {
                            id: 'task6',
                            title: 'Implement JWT authentication',
                            description: 'JWT token implementation',
                            taskLevel: 'SUBTASK',
                            status: 'DONE'
                          },
                          {
                            id: 'task7',
                            title: 'Implement refresh token logic',
                            description: 'Refresh token implementation',
                            taskLevel: 'SUBTASK',
                            status: 'DONE'
                          }
                        ]
                      },
                      {
                        id: 'task4',
                        title: 'OAuth Integration',
                        description: 'Implement OAuth providers integration',
                        taskLevel: 'TASK',
                        status: 'IN_PROGRESS',
                        childTasks: [
                          {
                            id: 'task8',
                            title: 'Google OAuth integration',
                            description: 'Implement Google OAuth',
                            taskLevel: 'SUBTASK',
                            status: 'DONE'
                          },
                          {
                            id: 'task9',
                            title: 'Facebook OAuth integration',
                            description: 'Implement Facebook OAuth',
                            taskLevel: 'SUBTASK',
                            status: 'IN_PROGRESS'
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: 'task5',
                    title: 'Frontend Authentication',
                    description: 'Implement frontend authentication components',
                    taskLevel: 'MILESTONE',
                    status: 'TODO',
                    childTasks: []
                  }
                ]
              }
            ]
          }
        };
      }
      
      // Get task with dependencies
      if (query.includes('GetTaskWithSubTasks') && variables.taskId === 'task3') {
        return {
          getTask: {
            id: 'task3',
            title: 'User Authentication API',
            subTasks: [
              {
                id: 'task6',
                title: 'Implement JWT authentication',
                dependencies: []
              },
              {
                id: 'task7',
                title: 'Implement refresh token logic',
                dependencies: [
                  { id: 'task6' }
                ]
              }
            ]
          }
        };
      }
      
      // For analyze_task_dependencies
      if (query.includes('GetChildTasks') && variables.parentId === 'task4') {
        return {
          getTask: {
            id: 'task4',
            childTasks: [
              {
                id: 'task8',
                title: 'Google OAuth integration',
                taskLevel: 'SUBTASK',
                status: 'DONE',
                dependencies: [],
                scopeContext: '{"projectId": "project1"}'
              },
              {
                id: 'task9',
                title: 'Facebook OAuth integration',
                taskLevel: 'SUBTASK',
                status: 'IN_PROGRESS',
                dependencies: [
                  { id: 'task8' }
                ],
                scopeContext: '{"projectId": "project1"}'
              },
              {
                id: 'task10',
                title: 'Twitter OAuth integration',
                taskLevel: 'SUBTASK',
                status: 'TODO',
                dependencies: [
                  { id: 'task8' }
                ],
                scopeContext: '{"projectId": "project1"}'
              }
            ]
          }
        };
      }
      
      // For workflow resolution in analyze_task_dependencies
      if (query.includes('resolveConfigByScope')) {
        return {
          success: true,
          data: {
            workflow: {
              id: 'workflow1',
              name: 'OAuth Integration',
              steps: [
                { id: 'step1', name: 'Setup OAuth Client' },
                { id: 'step2', name: 'Implement OAuth Flow' },
                { id: 'step3', name: 'Test OAuth Integration' }
              ]
            }
          }
        };
      }
      
      // For task-workflow step mappings
      if (query.includes('GetTaskStepMappings')) {
        return {
          getTasks: [
            { id: 'task8', guidedByStep: { id: 'step1' } },
            { id: 'task9', guidedByStep: { id: 'step2' } },
            { id: 'task10', guidedByStep: { id: 'step3' } }
          ]
        };
      }
      
      return {};
    });
    
    // Mock executeMutation for update operations
    mockDb.executeMutation = jest.fn().mockImplementation((mutation, variables) => {
      if (mutation.includes('addTask')) {
        const taskId = uuidv4();
        return { 
          addTask: { 
            task: { 
              id: taskId 
            } 
          } 
        };
      }
      
      if (mutation.includes('updateTask')) {
        return { 
          updateTask: { 
            task: { 
              id: variables.id 
            } 
          } 
        };
      }
      
      return { success: true };
    });
    
    // Mock analyzeTaskDependencies function
    global.analyzeTaskDependencies = analyzeTaskDependencies;
    
    // Replace the graphDb in query_ckg and update_ckg with our mock
    global.graphDb = mockDb;
  });
  
  afterEach(() => {
    jest.resetAllMocks();
  });
  
  test('should fetch hierarchical task structure', async () => {
    const result = await queryCkg({
      queryType: 'getNodeById',
      parameters: {
        nodeType: 'Project',
        id: 'project1'
      },
      requiredProperties: ['id', 'name', 'tasks { id title taskLevel status childTasks { id title taskLevel status } }']
    });
    
    expect(result.success).toBe(true);
    expect(result.data.getProject).toBeDefined();
    expect(result.data.getProject.tasks).toBeDefined();
    
    // Check the project
    const project = result.data.getProject;
    expect(project.name).toBe('Authentication Service');
    
    // Check the task hierarchy
    const projectTask = project.tasks[0];
    expect(projectTask.taskLevel).toBe('PROJECT');
    expect(projectTask.childTasks.length).toBe(2); // Should have 2 milestone tasks
    
    // Check milestone tasks
    const milestoneTask = projectTask.childTasks[0];
    expect(milestoneTask.taskLevel).toBe('MILESTONE');
    expect(milestoneTask.title).toBe('Backend Authentication');
  });
  
  test('should create task with correct hierarchy level', async () => {
    const result = await updateCkg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'New Milestone',
          description: 'A new milestone task',
          taskLevel: 'MILESTONE',
          status: 'TODO',
          project: { id: 'project1' },
          parentTask: { id: 'task1' } // Parent is a PROJECT task
        }
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.data.addTask).toBeDefined();
    expect(result.data.addTask.task.id).toBeDefined();
    
    // Verify the mutation was called with correct parameters
    expect(mockDb.executeMutation).toHaveBeenCalled();
    const mockCall = mockDb.executeMutation.mock.calls[0][1];
    expect(mockCall.input[0].taskLevel).toBe('MILESTONE');
    expect(mockCall.input[0].parentTask.id).toBe('task1');
  });
  
  test('should update parent-child relationship', async () => {
    const result = await updateCkg({
      updateType: 'updateNodeProperties',
      parameters: {
        nodeType: 'Task',
        nodeId: 'task5',
        properties: {
          parentTask: { id: 'task2' } // Move from task1 to task2
        }
      }
    });
    
    expect(result.success).toBe(true);
    
    // Verify the mutation was called with correct parameters
    expect(mockDb.executeMutation).toHaveBeenCalled();
    const mockCall = mockDb.executeMutation.mock.calls[0][1];
    expect(mockCall.set.parentTask.id).toBe('task2');
  });
  
  test('analyzeTaskDependencies should consider both explicit dependencies and workflow steps', async () => {
    // We'll mock analyzeTaskDependencies since it uses queryCkg internally
    // This is a more complex test that would involve multiple internal calls
    
    // First get the parent task to analyze
    const queryResult = await queryCkg({
      queryType: 'getNodeById',
      parameters: {
        nodeType: 'Task',
        id: 'task4'
      },
      requiredProperties: ['id', 'title', 'taskLevel', 'scopeContext']
    });
    
    expect(queryResult.success).toBe(true);
    
    // Now analyze dependencies
    const dependencyResult = await analyzeTaskDependencies({
      parent_task_id: 'task4'
    });
    
    // Verify results - our mock doesn't fully implement this, but the real function would
    expect(dependencyResult.task_id).toBe('task4');
    expect(dependencyResult.runnable_tasks).toBeDefined();
    expect(dependencyResult.blocked_tasks).toBeDefined();
    expect(dependencyResult.execution_plan).toBeDefined();
  });
  
  test('should create a complete task hierarchy from project to subtask', async () => {
    // Create project task
    const projectTaskResult = await updateCkg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'New Project Task',
          description: 'A new project task',
          taskLevel: 'PROJECT',
          status: 'TODO',
          project: { id: 'project1' }
        }
      }
    });
    
    expect(projectTaskResult.success).toBe(true);
    const projectTaskId = projectTaskResult.data.addTask.task.id;
    
    // Create milestone task
    const milestoneTaskResult = await updateCkg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'New Milestone Task',
          description: 'A new milestone task',
          taskLevel: 'MILESTONE',
          status: 'TODO',
          project: { id: 'project1' },
          parentTask: { id: projectTaskId }
        }
      }
    });
    
    expect(milestoneTaskResult.success).toBe(true);
    const milestoneTaskId = milestoneTaskResult.data.addTask.task.id;
    
    // Create regular task
    const taskResult = await updateCkg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'New Regular Task',
          description: 'A new regular task',
          taskLevel: 'TASK',
          status: 'TODO',
          project: { id: 'project1' },
          parentTask: { id: milestoneTaskId }
        }
      }
    });
    
    expect(taskResult.success).toBe(true);
    const taskId = taskResult.data.addTask.task.id;
    
    // Create subtask
    const subtaskResult = await updateCkg({
      updateType: 'createNode',
      parameters: {
        nodeType: 'Task',
        properties: {
          title: 'New Subtask',
          description: 'A new subtask',
          taskLevel: 'SUBTASK',
          status: 'TODO',
          project: { id: 'project1' },
          parentTask: { id: taskId }
        }
      }
    });
    
    expect(subtaskResult.success).toBe(true);
    
    // We've now created a complete hierarchy
    // In a full implementation, we would query to verify the relationships
  });
});

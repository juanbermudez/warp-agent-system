// src/tests/db-operations.test.ts
import { getLocalGraphClient } from '../db/local-graph.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const dbDir = path.join(projectRoot, '.warp_memory', 'local_db');

// Test configuration
const testConfig = {
  cleanup: true, // Set to false to keep test data for inspection
};

// Utility functions for testing
async function cleanupTestData() {
  try {
    // Only delete test data files, not the directory itself
    const files = await fs.readdir(dbDir);
    for (const file of files) {
      if (file.startsWith('test_') || file.endsWith('.json')) {
        await fs.unlink(path.join(dbDir, file));
      }
    }
    console.log('Test data cleaned up');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

async function ensureDbDir() {
  try {
    await fs.mkdir(dbDir, { recursive: true });
  } catch (error) {
    console.error('Error ensuring db directory exists:', error);
  }
}

// Main test function
async function runTests() {
  console.log('Starting database operations tests...');
  
  // Ensure the database directory exists
  await ensureDbDir();
  
  // Create a local graph client
  const client = getLocalGraphClient();
  
  // Test data
  const project = {
    id: 'test_project_1',
    name: 'Test Project',
    description: 'A project for testing the CKG',
    rootPath: '/tmp/test-project',
    createdAt: new Date().toISOString()
  };
  
  const task1 = {
    id: 'test_task_1',
    title: 'Implement database tests',
    description: 'Write comprehensive tests for the CKG database operations',
    status: 'IN_PROGRESS',
    priority: 1,
    createdAt: new Date().toISOString()
  };
  
  const task2 = {
    id: 'test_task_2',
    title: 'Fix database bugs',
    description: 'Address issues found during testing',
    status: 'TODO',
    priority: 2,
    createdAt: new Date().toISOString()
  };
  
  try {
    console.log('\n===== TEST: Create Project =====');
    const createProjectMutation = `
      mutation CreateProject($input: [AddProjectInput!]!) {
        addProject(input: $input) {
          project {
            id
            name
            description
          }
        }
      }
    `;
    
    const createProjectResult = await client.request(createProjectMutation, { 
      input: project 
    });
    
    console.log('Create Project Result:', JSON.stringify(createProjectResult, null, 2));
    
    if (createProjectResult.addProject?.project?.[0]?.id === project.id) {
      console.log('✅ Project created successfully');
    } else {
      console.log('❌ Project creation failed');
    }
    
    console.log('\n===== TEST: Create Tasks =====');
    const createTaskMutation = `
      mutation CreateTask($input: [AddTaskInput!]!) {
        addTask(input: $input) {
          task {
            id
            title
            description
            status
          }
        }
      }
    `;
    
    // Create first task
    const createTask1Result = await client.request(createTaskMutation, { 
      input: task1 
    });
    
    console.log('Create Task 1 Result:', JSON.stringify(createTask1Result, null, 2));
    
    if (createTask1Result.addTask?.task?.[0]?.id === task1.id) {
      console.log('✅ Task 1 created successfully');
    } else {
      console.log('❌ Task 1 creation failed');
    }
    
    // Create second task
    const createTask2Result = await client.request(createTaskMutation, { 
      input: task2 
    });
    
    console.log('Create Task 2 Result:', JSON.stringify(createTask2Result, null, 2));
    
    if (createTask2Result.addTask?.task?.[0]?.id === task2.id) {
      console.log('✅ Task 2 created successfully');
    } else {
      console.log('❌ Task 2 creation failed');
    }
    
    console.log('\n===== TEST: Query Project by ID =====');
    const queryProjectQuery = `
      query GetProject($id: ID!) {
        getProject(id: $id) {
          id
          name
          description
        }
      }
    `;
    
    const queryProjectResult = await client.request(queryProjectQuery, { 
      id: project.id 
    });
    
    console.log('Query Project Result:', JSON.stringify(queryProjectResult, null, 2));
    
    if (queryProjectResult.getProject?.id === project.id) {
      console.log('✅ Project query successful');
    } else {
      console.log('❌ Project query failed');
    }
    
    console.log('\n===== TEST: Query Tasks by Filter =====');
    const queryTasksQuery = `
      query GetTasks($filter: TaskFilter, $first: Int) {
        queryTask(filter: $filter, first: $first) {
          id
          title
          status
        }
      }
    `;
    
    // Query by status
    const queryTasksByStatusResult = await client.request(queryTasksQuery, { 
      filter: { status: { eq: 'IN_PROGRESS' } },
      first: 10
    });
    
    console.log('Query Tasks by Status Result:', JSON.stringify(queryTasksByStatusResult, null, 2));
    
    if (queryTasksByStatusResult.queryTask?.length === 1 && 
        queryTasksByStatusResult.queryTask[0].id === task1.id) {
      console.log('✅ Tasks query by status successful');
    } else {
      console.log('❌ Tasks query by status failed');
    }
    
    console.log('\n===== TEST: Update Task =====');
    const updateTaskMutation = `
      mutation UpdateTask($input: UpdateTaskInput!) {
        updateTask(input: $input) {
          task {
            id
            title
            status
            description
          }
        }
      }
    `;
    
    const updateTaskResult = await client.request(updateTaskMutation, { 
      input: {
        filter: { id: task2.id },
        set: { 
          status: 'IN_PROGRESS',
          description: 'Updated description - now in progress' 
        }
      }
    });
    
    console.log('Update Task Result:', JSON.stringify(updateTaskResult, null, 2));
    
    if (updateTaskResult.updateTask?.task?.[0]?.status === 'IN_PROGRESS') {
      console.log('✅ Task update successful');
    } else {
      console.log('❌ Task update failed');
    }
    
    console.log('\n===== TEST: Create Relationship =====');
    // Add project reference to task
    const createRelationshipMutation = `
      mutation AddProjectToTask($input: UpdateTaskInput!) {
        updateTask(input: $input) {
          task {
            id
            title
          }
        }
      }
    `;
    
    const createRelationshipResult = await client.request(createRelationshipMutation, { 
      input: {
        filter: { id: task1.id },
        set: { project: { id: project.id } }
      }
    });
    
    console.log('Create Relationship Result:', JSON.stringify(createRelationshipResult, null, 2));
    
    if (createRelationshipResult.updateTask?.task?.[0]?.id === task1.id) {
      console.log('✅ Relationship creation successful');
    } else {
      console.log('❌ Relationship creation failed');
    }
    
    console.log('\n===== TEST: Query Tasks by Filter (Find multiple) =====');
    // Query IN_PROGRESS tasks after update (should find 2 now)
    const queryMultipleTasksResult = await client.request(queryTasksQuery, { 
      filter: { status: { eq: 'IN_PROGRESS' } },
      first: 10
    });
    
    console.log('Query Multiple Tasks Result:', JSON.stringify(queryMultipleTasksResult, null, 2));
    
    if (queryMultipleTasksResult.queryTask?.length === 2) {
      console.log('✅ Multiple tasks query successful');
    } else {
      console.log('❌ Multiple tasks query failed');
    }
    
    console.log('\n===== TEST: Delete Task =====');
    const deleteTaskMutation = `
      mutation DeleteTask($filter: TaskFilter!) {
        deleteTask(filter: $filter) {
          msg
        }
      }
    `;
    
    const deleteTaskResult = await client.request(deleteTaskMutation, { 
      filter: { id: task2.id }
    });
    
    console.log('Delete Task Result:', JSON.stringify(deleteTaskResult, null, 2));
    
    // Verify deletion by querying again
    const queryAfterDeleteResult = await client.request(queryTasksQuery, { 
      filter: { id: { eq: task2.id } },
      first: 1
    });
    
    console.log('Query After Delete Result:', JSON.stringify(queryAfterDeleteResult, null, 2));
    
    if (queryAfterDeleteResult.queryTask?.length === 0) {
      console.log('✅ Task deletion successful');
    } else {
      console.log('❌ Task deletion failed');
    }
    
    console.log('\n===== TEST: Error Handling - Query Non-existent Entity =====');
    const queryNonExistentQuery = `
      query GetNonExistent($id: ID!) {
        getProject(id: $id) {
          id
          name
        }
      }
    `;
    
    try {
      const queryNonExistentResult = await client.request(queryNonExistentQuery, { 
        id: 'non_existent_id' 
      });
      
      console.log('Query Non-existent Result:', JSON.stringify(queryNonExistentResult, null, 2));
      
      if (queryNonExistentResult.getProject === null) {
        console.log('✅ Non-existent entity query handled correctly');
      } else {
        console.log('❌ Non-existent entity query handling failed');
      }
    } catch (error) {
      console.log('❌ Non-existent entity query threw an error:', error);
    }
    
    console.log('\n===== ALL TESTS COMPLETED =====');
    
  } catch (error) {
    console.error('Test Error:', error);
  } finally {
    // Clean up test data if configured to do so
    if (testConfig.cleanup) {
      await cleanupTestData();
    }
  }
}

// Run the tests and exit
runTests()
  .then(() => {
    console.log('Tests completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error during tests:', error);
    process.exit(1);
  });

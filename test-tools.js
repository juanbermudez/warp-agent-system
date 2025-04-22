// test-tools.js - Simple script to test query_ckg and update_ckg
const { queryCkg } = require('./dist/tools/query_ckg');
const { updateCkg } = require('./dist/tools/update_ckg');

// Create a test project
async function createTestProject() {
  console.log('Creating test project...');
  
  const result = await updateCkg({
    updateType: 'createNode',
    nodeType: 'Project',
    nodeData: {
      name: 'Test Project',
      description: 'A test project for the Warp Agent System',
      rootPath: '/Users/juanbermudez/Documents/Work/TestProject',
      createdAt: new Date().toISOString()
    }
  });
  
  console.log('Create project result:', JSON.stringify(result, null, 2));
  return result.nodeId;
}

// Create a test task in the project
async function createTestTask(projectId) {
  console.log('Creating test task...');
  
  const result = await updateCkg({
    updateType: 'createNode',
    nodeType: 'Task',
    nodeData: {
      title: 'Test Task',
      description: 'A test task for the Warp Agent System',
      status: 'TODO',
      project: { id: projectId },
      createdAt: new Date().toISOString()
    }
  });
  
  console.log('Create task result:', JSON.stringify(result, null, 2));
  return result.nodeId;
}

// Query for projects
async function queryProjects() {
  console.log('Querying for projects...');
  
  const result = await queryCkg({
    queryType: 'findNodesByLabel',
    nodeType: 'Project',
    parameters: {
      label: 'Test',
      limit: 10
    }
  });
  
  console.log('Query projects result:', JSON.stringify(result, null, 2));
  return result;
}

// Query for tasks
async function queryTasks() {
  console.log('Querying for tasks...');
  
  const result = await queryCkg({
    queryType: 'findNodesByLabel',
    nodeType: 'Task',
    parameters: {
      label: 'Test',
      limit: 10
    }
  });
  
  console.log('Query tasks result:', JSON.stringify(result, null, 2));
  return result;
}

// Main test function
async function runTests() {
  try {
    const projectId = await createTestProject();
    const taskId = await createTestTask(projectId);
    
    await queryProjects();
    await queryTasks();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();

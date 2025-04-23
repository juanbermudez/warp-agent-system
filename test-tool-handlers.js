// Test tool handlers functionality
// This script tests the tool handlers to make sure they work correctly

import { getToolHandlers } from './dist/tools/index.js';

const testToolHandlers = async () => {
  console.log('Testing tool handlers...');
  
  try {
    // Get tool handlers
    const tools = getToolHandlers();
    console.log('Available tools:', Object.keys(tools));
    
    // Test queryCkgTool
    const queryCkgTool = tools.queryCkgTool;
    console.log('Testing queryCkgTool:', {
      name: queryCkgTool.name,
      description: queryCkgTool.description,
      parameters: queryCkgTool.parameters,
      handlerType: typeof queryCkgTool.handler
    });
    
    // Mock query parameters
    const queryParams = {
      queryType: 'getNodeById',
      parameters: {
        nodeType: 'Task',
        id: 'test-task-id'
      }
    };
    
    // Call the handler
    console.log('Calling queryCkgTool handler...');
    const queryResult = await queryCkgTool.handler(queryParams);
    console.log('Result type:', typeof queryResult);
  } catch (error) {
    console.error('Error testing tool handlers:', error);
  }
};

testToolHandlers();

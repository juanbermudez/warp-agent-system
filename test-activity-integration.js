// Test Activity Schema Integration
// This script tests if the Activity schema has been properly integrated into the CKG

import { queryCkg } from './dist/tools/query_ckg.js';
import { updateCkg } from './dist/tools/update_ckg.js';
import { v4 as uuidv4 } from 'uuid';

async function testActivitySchema() {
  console.log('==== Testing CKG Activity Schema Integration ====');
  
  // First, test if we can create an Activity node
  const activityId = `test-act-${uuidv4()}`;
  const timestamp = new Date().toISOString();
  
  try {
    console.log('Creating test Activity node...');
    
    const createResult = await updateCkg({
      updateType: 'createNode',
      nodeType: 'Activity',
      nodeData: {
        id: activityId,
        timestamp: timestamp,
        actorType: 'USER',
        actorId: 'test-user',
        activityType: 'COMMENT',
        title: 'Test Activity',
        content: 'This is a test activity to verify schema integration',
        renderMode: 'ALWAYS_EXPANDED',
        nestingLevel: 0,
        createdAt: timestamp
      }
    });
    
    console.log('Create result:', createResult);
    
    if (createResult.status === 'success') {
      console.log('✅ Successfully created Activity node!');
      
      // Try to retrieve the created node
      console.log('Retrieving created Activity node...');
      
      const queryResult = await queryCkg({
        queryType: 'getNodeById',
        nodeType: 'Activity',
        parameters: {
          id: activityId
        }
      });
      
      console.log('Query result:', queryResult);
      
      if (queryResult.status === 'success' && queryResult.results && queryResult.results.length > 0) {
        console.log('✅ Successfully retrieved Activity node!');
        console.log('Schema integration is working correctly.');
      } else {
        console.log('❌ Failed to retrieve Activity node.');
        console.log('Schema might be integrated but there are issues with querying.');
      }
    } else {
      if (createResult.error && createResult.error.includes('Unknown label: Activity')) {
        console.log('❌ Failed to create Activity node: Activity type not found in schema.');
        console.log('Schema integration has not been completed successfully.');
      } else {
        console.log('❌ Failed to create Activity node due to other reasons.');
        console.log('Error:', createResult.error);
      }
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  console.log('==== Test Complete ====');
}

testActivitySchema();

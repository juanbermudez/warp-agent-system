// Test Activity Creation Script
// This script tests if we can create an Activity entity in the CKG

import { updateCkg } from './dist/tools/update_ckg.js';
import { queryCkg } from './dist/tools/query_ckg.js';
import { v4 as uuidv4 } from 'uuid';

async function testCreateActivity() {
  console.log('==== Testing Activity Creation ====');
  
  // Generate a unique activity ID
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
      
      console.log('Attempting to retrieve the created activity...');
      
      const queryResult = await queryCkg({
        queryType: 'getNodeById',
        nodeType: 'Activity',
        parameters: {
          id: activityId
        }
      });
      
      console.log('Query result:', queryResult);
      
      if (queryResult.status === 'success' && queryResult.results.length > 0) {
        console.log('✅ Successfully retrieved Activity node!');
        console.log('Activity data:', JSON.stringify(queryResult.results[0], null, 2));
        console.log('CKG Activity Schema Implementation is working correctly.');
      } else {
        console.log('❌ Failed to retrieve Activity node.');
        console.log('Activity creation succeeded but retrieval failed.');
      }
    } else {
      console.log('❌ Failed to create Activity node.');
      console.log('Error:', createResult.error);
    }
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  console.log('==== Test Complete ====');
}

testCreateActivity();

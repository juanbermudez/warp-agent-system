// Simple test script to verify activity schema integration
import { queryCkg } from './src/tools/query_ckg.js';

async function testActivitySchema() {
  try {
    console.log('Testing if Activity entity exists in schema...');
    
    // Try to query for Activity node definition
    const result = await queryCkg({
      queryType: 'findNodesByLabel',
      nodeType: 'Activity',
      parameters: {
        limit: 1
      }
    });
    
    console.log('Query response:', JSON.stringify(result, null, 2));
    
    if (result.status === 'success') {
      console.log('✅ Activity schema integration successful!');
    } else if (result.error && result.error.includes('Activity')) {
      console.log('❌ Activity schema not found in CKG. Schema integration failed.');
    } else {
      console.log('❓ Inconclusive test. Check the query response for details.');
    }
  } catch (error) {
    console.error('Error testing activity schema:', error);
  }
}

testActivitySchema();

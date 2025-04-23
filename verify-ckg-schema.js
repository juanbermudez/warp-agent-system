// Verify CKG Schema for Activity Tracking
import { queryCkg } from './dist/tools/query_ckg.js';

async function verifySchema() {
  console.log('Verifying CKG schema for Activity types...');
  
  try {
    // Query schema definition to check for Activity type
    const result = await queryCkg({
      queryType: 'introspectSchema',
      parameters: {
        types: ['Activity', 'ActivityGroup', 'FileChangeActivity']
      }
    });
    
    console.log('Schema introspection result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error verifying schema:', error);
    return { status: 'error', error: String(error) };
  }
}

verifySchema();

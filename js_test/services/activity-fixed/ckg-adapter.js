/**
 * Mock CKG adapter for testing
 */

// Mock query results
const mockActivities = new Map();

// Mock query function
export async function queryCkg(params) {
  console.log('Mock queryCkg called with params:', JSON.stringify(params));
  
  // Handle different query types
  if (params.queryType === 'findRelatedNodes') {
    const nodeId = params.parameters?.nodeId;
    let results = [];
    
    // Get activities for the task
    if (params.nodeType === 'Task' && params.parameters?.relationType === 'activities') {
      results = Array.from(mockActivities.values())
        .filter(activity => activity.taskId === nodeId);
    }
    
    return {
      success: true,
      status: 'success',
      results: results
    };
  }
  
  return {
    success: true,
    status: 'success',
    results: []
  };
}

// Mock update function
export async function updateCkg(params) {
  console.log('Mock updateCkg called with params:', JSON.stringify(params));
  
  // Handle different update types
  if (params.updateType === 'createNode' && params.nodeType === 'Activity') {
    const activity = params.nodeData;
    mockActivities.set(activity.id, activity);
    console.log(`Mock activity created with ID: ${activity.id}`);
  } else if (params.updateType === 'createRelationship') {
    console.log(`Mock relationship created from ${params.nodeType}:${params.nodeId} to ${params.targetNodeType}:${params.targetNodeId}`);
  }
  
  return {
    success: true,
    status: 'success'
  };
}

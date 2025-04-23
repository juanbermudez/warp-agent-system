/**
 * CKG Adapter for Activity Tracker
 * 
 * This adapter provides compatible interfaces to the CKG functions
 * to bridge the gap between the Activity Tracker and the CKG.
 */

import { queryCkg as ckgQuery } from '../../tools/query-ckg.js';
import { updateCkg as ckgUpdate } from '../../tools/update-ckg.js';

// Define the return type for query operations
export interface QueryResult {
  success: boolean;
  status: 'success' | 'error';
  results?: any[];
  data?: any;
  error?: string;
}

// Define the return type for update operations
export interface UpdateResult {
  success: boolean;
  status: 'success' | 'error';
  error?: string;
}

/**
 * Adapter for queryCkg function
 * 
 * Converts the parameters to the format expected by the CKG
 * and converts the result to the format expected by the Activity Tracker.
 */
export async function queryCkg(params: any): Promise<QueryResult> {
  // Convert parameters to the format expected by the CKG
  const ckgParams: any = {};
  
  // Handle different query types
  if (params.queryType) {
    ckgParams.queryType = params.queryType;
  }
  
  // Handle node-specific queries
  if (params.nodeType) {
    // For node lookups, we need to adjust the parameters format
    ckgParams.parameters = {
      ...params.parameters
    };
    
    // Add node type if specified
    if (params.nodeType) {
      ckgParams.parameters.entityType = params.nodeType;
    }
  } else {
    // For other queries, pass parameters directly
    ckgParams.parameters = params.parameters || {};
  }
  
  try {
    // Call the CKG query function
    const result = await ckgQuery(ckgParams);
    
    // Convert result to the format expected by the Activity Tracker
    return {
      success: result.success,
      status: result.success ? 'success' : 'error',
      results: result.data ? (Array.isArray(result.data) ? result.data : [result.data]) : [],
      data: result.data,
      error: result.error
    };
  } catch (error: any) {
    // Handle errors
    return {
      success: false,
      status: 'error',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Adapter for updateCkg function
 * 
 * Converts the parameters to the format expected by the CKG
 * and converts the result to the format expected by the Activity Tracker.
 */
export async function updateCkg(params: any): Promise<UpdateResult> {
  // Convert parameters to the format expected by the CKG
  const ckgParams: any = {
    updateType: params.updateType,
    parameters: {}
  };
  
  // Handle different update types
  if (params.updateType === 'createNode') {
    // For createNode, we need to adjust the parameters format
    ckgParams.parameters = {
      entityType: params.nodeType,
      entityData: params.nodeData
    };
  } else if (params.updateType === 'updateNodeProperties') {
    // For updateNodeProperties, we need to adjust the parameters format
    ckgParams.parameters = {
      entityType: params.nodeType,
      entityId: params.nodeId,
      properties: params.nodeData
    };
  } else if (params.updateType === 'createRelationship') {
    // For createRelationship, we need to adjust the parameters format
    ckgParams.parameters = {
      sourceType: params.nodeType,
      sourceId: params.nodeId,
      relationshipType: params.relationshipType,
      targetType: params.targetNodeType,
      targetId: params.targetNodeId
    };
  } else if (params.updateType === 'createTimePoint') {
    // For createTimePoint, we can pass parameters directly
    ckgParams.parameters = params.parameters;
  } else {
    // For other updates, pass parameters directly
    ckgParams.parameters = params.parameters || {};
  }
  
  try {
    // Call the CKG update function
    const result = await ckgUpdate(ckgParams);
    
    // Convert result to the format expected by the Activity Tracker
    return {
      success: result.success,
      status: result.success ? 'success' : 'error',
      error: result.error
    };
  } catch (error: any) {
    // Handle errors
    return {
      success: false,
      status: 'error',
      error: error.message || 'Unknown error'
    };
  }
}

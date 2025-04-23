/**
 * Update CKG Tool - Enhanced Dgraph Implementation
 * 
 * This tool provides a unified interface for updating the Code Knowledge Graph,
 * supporting scope-based configuration and time-based tracking.
 */

import { z } from 'zod';
import { GraphDatabase } from '../db/dgraph';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define validation schemas
const UpdateDetails = z.object({
  updateType: z.enum([
    'createNode',
    'updateNodeProperties',
    'createRelationship',
    'deleteNode',
    'deleteRelationship',
    'createScopedConfig',
    'createTimePoint'
  ]),
  parameters: z.record(z.any())
});

const ResultSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.string().optional()
});

// Initialize the database connection
const DB_PATH = process.env.WARP_LOCAL_DB_PATH || join(process.cwd(), '.warp_memory');
const DGRAPH_URL = process.env.WARP_DGRAPH_URL || 'localhost:9080';
const graphDb = new GraphDatabase(DGRAPH_URL, DB_PATH);

/**
 * Tool to update the Code Knowledge Graph
 * @param updateDetails Object specifying update type and parameters
 * @returns Object containing update results
 */
export async function update_ckg(updateDetails: z.infer<typeof UpdateDetails>): Promise<z.infer<typeof ResultSchema>> {
  try {
    // Validate input
    const validatedInput = UpdateDetails.parse(updateDetails);
    
    // Initialize database if not already initialized
    await graphDb.initialize();
    
    // Handle different update types
    switch (validatedInput.updateType) {
      case 'createNode':
        return handleCreateNode(validatedInput.parameters);
      case 'updateNodeProperties':
        return handleUpdateNodeProperties(validatedInput.parameters);
      case 'createRelationship':
        return handleCreateRelationship(validatedInput.parameters);
      case 'deleteNode':
        return handleDeleteNode(validatedInput.parameters);
      case 'deleteRelationship':
        return handleDeleteRelationship(validatedInput.parameters);
      case 'createScopedConfig':
        return handleCreateScopedConfig(validatedInput.parameters);
      case 'createTimePoint':
        return handleCreateTimePoint(validatedInput.parameters);
      default:
        return {
          success: false,
          error: `Unsupported update type: ${validatedInput.updateType}`,
          data: null
        };
    }
  } catch (error) {
    console.error('Error in update_ckg:', error);
    return {
      success: false,
      error: `Failed to update CKG: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle createNode update
 */
async function handleCreateNode(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { nodeType, properties } = parameters;
    
    if (!nodeType) {
      return {
        success: false,
        error: 'nodeType is required for createNode',
        data: null
      };
    }
    
    if (!properties) {
      return {
        success: false,
        error: 'properties are required for createNode',
        data: null
      };
    }
    
    // Add timestamps to properties
    const now = new Date().toISOString();
    const enhancedProperties = {
      ...properties,
      createdAt: now,
      modifiedAt: now
    };
    
    // Generate node ID if not provided
    if (!enhancedProperties.id) {
      enhancedProperties.id = uuidv4();
    }
    
    // Add dgraph.type if not present
    if (!enhancedProperties['dgraph.type']) {
      enhancedProperties['dgraph.type'] = nodeType;
    }
    
    // Build mutation
    const mutation = {
      set: [
        enhancedProperties
      ]
    };
    
    // Execute mutation
    const result = await graphDb.executeMutation(mutation);
    
    if (!result || !result.data || !result.data.uids) {
      throw new Error('Failed to create node');
    }
    
    const nodeId = enhancedProperties.id;
    
    // Create TimePoint for this creation event
    await createTimePointForEvent(nodeId, nodeType, 'CREATION', now);
    
    return {
      success: true,
      data: {
        id: nodeId,
        ...result
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `createNode failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle updateNodeProperties update
 */
async function handleUpdateNodeProperties(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { nodeType, nodeId, properties } = parameters;
    
    if (!nodeType || !nodeId) {
      return {
        success: false,
        error: 'nodeType and nodeId are required for updateNodeProperties',
        data: null
      };
    }
    
    if (!properties || Object.keys(properties).length === 0) {
      return {
        success: false,
        error: 'properties are required for updateNodeProperties',
        data: null
      };
    }
    
    // Add modifiedAt timestamp to properties
    const now = new Date().toISOString();
    const updatedProperties = {
      ...properties,
      modifiedAt: now
    };
    
    // Check if this is a status update
    const isStatusUpdate = properties.status !== undefined;
    const eventType = isStatusUpdate ? 'STATUS_CHANGE' : 'MODIFICATION';
    
    // Build property updates
    const updates = {};
    
    for (const [key, value] of Object.entries(updatedProperties)) {
      updates[`${nodeType}.${key}`] = value;
    }
    
    // Build mutation
    const mutation = {
      set: [
        {
          uid: nodeId,
          ...updates
        }
      ]
    };
    
    // Execute mutation
    const result = await graphDb.executeMutation(mutation);
    
    // Create TimePoint for this modification event with metadata about changes
    await createTimePointForEvent(
      nodeId, 
      nodeType, 
      eventType, 
      now, 
      { 
        changedProperties: Object.keys(properties),
        previousStatus: isStatusUpdate ? properties.oldStatus : undefined,
        newStatus: isStatusUpdate ? properties.status : undefined
      }
    );
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: `updateNodeProperties failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle createRelationship update
 */
async function handleCreateRelationship(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { fromType, fromId, relationType, toType, toId } = parameters;
    
    if (!fromType || !fromId || !relationType || !toType || !toId) {
      return {
        success: false,
        error: 'fromType, fromId, relationType, toType, and toId are required for createRelationship',
        data: null
      };
    }
    
    // Build mutation - schema-aware relationship creation
    const mutation = {
      set: [
        {
          uid: fromId,
          [`${fromType}.${relationType}`]: [
            {
              uid: toId
            }
          ]
        }
      ]
    };
    
    // Execute mutation
    const result = await graphDb.executeMutation(mutation);
    
    // Track relationship creation with a TimePoint
    const now = new Date().toISOString();
    
    // Create a relationship-specific TimePoint 
    await createTimePointForEvent(
      `${fromId}_${toId}`, 
      `Relationship_${relationType}`, 
      'CREATION', 
      now,
      { 
        fromId, 
        fromType, 
        toId, 
        toType, 
        relationType 
      }
    );
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: `createRelationship failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle deleteNode update
 */
async function handleDeleteNode(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { nodeType, nodeId } = parameters;
    
    if (!nodeType || !nodeId) {
      return {
        success: false,
        error: 'nodeType and nodeId are required for deleteNode',
        data: null
      };
    }
    
    // Build deletion mutation
    const mutation = {
      delete: [
        {
          uid: nodeId
        }
      ]
    };
    
    // Execute mutation
    const result = await graphDb.executeMutation(mutation);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: `deleteNode failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle deleteRelationship update
 */
async function handleDeleteRelationship(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { fromType, fromId, relationType, toType, toId } = parameters;
    
    if (!fromType || !fromId || !relationType || !toType || !toId) {
      return {
        success: false,
        error: 'fromType, fromId, relationType, toType, and toId are required for deleteRelationship',
        data: null
      };
    }
    
    // Build deletion mutation for the relationship
    const mutation = {
      delete: [
        {
          uid: fromId,
          [`${fromType}.${relationType}`]: [
            {
              uid: toId
            }
          ]
        }
      ]
    };
    
    // Execute mutation
    const result = await graphDb.executeMutation(mutation);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: `deleteRelationship failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle createScopedConfig update
 * Creates a configuration entity (Rule, Workflow, Persona) with proper scope
 */
async function handleCreateScopedConfig(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { configType, scope, scopeEntityId, configData } = parameters;
    
    if (!configType || !scope || !configData) {
      return {
        success: false,
        error: 'configType, scope, and configData are required for createScopedConfig',
        data: null
      };
    }
    
    // Validate config type
    if (!['Rule', 'Workflow', 'Persona'].includes(configType)) {
      return {
        success: false,
        error: `Invalid configType: ${configType}. Must be Rule, Workflow, or Persona.`,
        data: null
      };
    }
    
    // Validate scope
    if (!['DEFAULT', 'ORG', 'TEAM', 'PROJECT', 'USER'].includes(scope)) {
      return {
        success: false,
        error: `Invalid scope: ${scope}. Must be DEFAULT, ORG, TEAM, PROJECT, or USER.`,
        data: null
      };
    }
    
    // For non-DEFAULT scopes, scopeEntityId is required
    if (scope !== 'DEFAULT' && !scopeEntityId) {
      return {
        success: false,
        error: `scopeEntityId is required for scope ${scope}`,
        data: null
      };
    }
    
    // Generate config ID
    const configId = configData.id || uuidv4();
    
    // Add required properties to config data
    const now = new Date().toISOString();
    const enhancedConfigData = {
      ...configData,
      id: configId,
      'dgraph.type': configType,
      [`${configType}.scope`]: scope,
      [`${configType}.isActive`]: true,
      [`${configType}.createdAt`]: now,
      [`${configType}.modifiedAt`]: now
    };
    
    // Build mutation to create config entity
    const createMutation = {
      set: [
        enhancedConfigData
      ]
    };
    
    // Execute mutation
    const createResult = await graphDb.executeMutation(createMutation);
    
    if (!createResult || !createResult.data || !createResult.data.uids) {
      throw new Error(`Failed to create ${configType}`);
    }
    
    // Create TimePoint for this creation event
    await createTimePointForEvent(configId, configType, 'CREATION', now);
    
    // If non-DEFAULT scope, create relationship to scope entity
    if (scope !== 'DEFAULT' && scopeEntityId) {
      let scopeEntityType;
      
      switch (scope) {
        case 'USER':
          scopeEntityType = 'User';
          break;
        case 'PROJECT':
          scopeEntityType = 'Project';
          break;
        case 'TEAM':
          scopeEntityType = 'Team';
          break;
        case 'ORG':
          scopeEntityType = 'Organization';
          break;
      }
      
      // Build mutation to link config to scope entity
      const relationMutation = {
        set: [
          {
            uid: scopeEntityId,
            [`${scopeEntityType}.${configType.toLowerCase()}s`]: [
              {
                uid: configId
              }
            ]
          }
        ]
      };
      
      // Execute relation mutation
      await graphDb.executeMutation(relationMutation);
    }
    
    return {
      success: true,
      data: {
        configId,
        ...createResult
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `createScopedConfig failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle createTimePoint update
 * Creates a TimePoint entity to record a temporal event
 */
async function handleCreateTimePoint(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { entityId, entityType, eventType, timestamp, metadata } = parameters;
    
    if (!entityId || !entityType || !eventType) {
      return {
        success: false,
        error: 'entityId, entityType, and eventType are required for createTimePoint',
        data: null
      };
    }
    
    const timePointId = await createTimePointForEvent(
      entityId, 
      entityType, 
      eventType, 
      timestamp || new Date().toISOString(),
      metadata
    );
    
    return {
      success: true,
      data: { timePointId }
    };
  } catch (error) {
    return {
      success: false,
      error: `createTimePoint failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Helper function to create a TimePoint entity for an event
 */
async function createTimePointForEvent(
  entityId: string, 
  entityType: string, 
  eventType: string, 
  timestamp: string = new Date().toISOString(),
  metadata?: any
): Promise<string> {
  try {
    // Generate a unique ID for the TimePoint
    const timePointId = uuidv4();
    
    // Build TimePoint properties
    const timePointData = {
      uid: timePointId,
      'dgraph.type': 'TimePoint',
      'TimePoint.timestamp': timestamp,
      'TimePoint.entityId': entityId,
      'TimePoint.entityType': entityType,
      'TimePoint.eventType': eventType,
      ...(metadata ? { 'TimePoint.metadata': JSON.stringify(metadata) } : {})
    };
    
    // Build mutation
    const mutation = {
      set: [
        timePointData
      ]
    };
    
    // Execute mutation
    const result = await graphDb.executeMutation(mutation);
    
    if (!result || !result.data || !result.data.uids) {
      throw new Error('Failed to create TimePoint');
    }
    
    // Create relationship between TimePoint and the entity
    const relationField = getTimePointRelationField(eventType);
    
    if (relationField) {
      // Link TimePoint to entity
      const entityMutation = {
        set: [
          {
            uid: entityId,
            [`${entityType}.${relationField}`]: [
              {
                uid: timePointId
              }
            ]
          }
        ]
      };
      
      await graphDb.executeMutation(entityMutation);
    }
    
    return timePointId;
  } catch (error) {
    console.error('Error creating TimePoint:', error);
    throw error;
  }
}

/**
 * Helper function to determine the appropriate relation field based on event type
 */
function getTimePointRelationField(eventType: string): string | null {
  switch (eventType) {
    case 'CREATION':
      return 'creationTimePoint';
    case 'MODIFICATION':
      return 'modificationTimePoints';
    case 'STATUS_CHANGE':
      return 'statusChangeTimePoints';
    case 'APPROVAL':
      return 'approvalTimePoint';
    case 'REJECTION':
      return 'rejectionTimePoint';
    case 'COMPLETION':
      return 'completionTimePoint';
    case 'RESOLUTION':
      return 'resolutionTimePoint';
    case 'AGENT_ACTIVITY':
      return 'activityTimePoints';
    case 'TERMINATION':
      return 'terminationTimePoint';
    case 'RESPONSE':
      return 'responseTimePoint';
    default:
      return null;
  }
}

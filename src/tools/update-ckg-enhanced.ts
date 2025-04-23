import { z } from 'zod';
import { GraphDatabase } from '../db/dgraph.js';
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
  error: z.string().optional(),
});

// Initialize the database connection
const DB_PATH = join(process.cwd(), '.warp_memory');
const graphDb = new GraphDatabase('localhost:9080', DB_PATH);

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
    
    // Construct GraphQL mutation
    const mutation = `
      mutation CreateNode($input: [Add${nodeType}Input!]!) {
        add${nodeType}(input: $input) {
          ${nodeType.toLowerCase()} {
            id
          }
        }
      }
    `;
    
    const result = await graphDb.executeMutation(mutation, { input: [enhancedProperties] });
    
    // If node created successfully, also create a TimePoint for CREATION event
    if (result && result[`add${nodeType}`] && result[`add${nodeType}`][nodeType.toLowerCase()]) {
      const nodeId = result[`add${nodeType}`][nodeType.toLowerCase()].id;
      
      // Create TimePoint for this creation event
      await createTimePointForEvent(nodeId, nodeType, 'CREATION', now);
    }
    
    return {
      success: true,
      data: result
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
    const isStatusUpdate = 'status' in properties;
    const eventType = isStatusUpdate ? 'STATUS_CHANGE' : 'MODIFICATION';
    
    // Construct GraphQL mutation
    const mutation = `
      mutation UpdateNodeProperties($id: ID!, $set: ${nodeType}Patch!) {
        update${nodeType}(input: { filter: { id: { eq: $id } }, set: $set }) {
          ${nodeType.toLowerCase()} {
            id
          }
        }
      }
    `;
    
    const result = await graphDb.executeMutation(mutation, { 
      id: nodeId,
      set: updatedProperties
    });
    
    // Create TimePoint for this modification event
    await createTimePointForEvent(nodeId, nodeType, eventType, now);
    
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
    
    const result = await graphDb.createRelationship(fromType, fromId, relationType, toType, toId);
    
    // Track relationship creation with a TimePoint
    const now = new Date().toISOString();
    
    // Create a relationship-specific TimePoint 
    await createTimePointForEvent(
      `${fromId}_${toId}`, 
      `Relationship_${relationType}`, 
      'CREATION', 
      now,
      { fromId, fromType, toId, toType, relationType }
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
    
    // Construct GraphQL mutation
    const mutation = `
      mutation DeleteNode($filter: ${nodeType}Filter!) {
        delete${nodeType}(filter: $filter) {
          numUids
        }
      }
    `;
    
    const result = await graphDb.executeMutation(mutation, { 
      filter: { id: { eq: nodeId } }
    });
    
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
    
    // Construct appropriate GraphQL mutation based on relationship type
    // This is a simplified approach - real implementation would be more complex
    const mutation = `
      mutation DeleteRelationship($fromId: ID!, $toId: ID!) {
        update${fromType}(input: { 
          filter: { id: { eq: $fromId } }, 
          remove: { ${relationType}: [{ id: $toId }] } 
        }) {
          ${fromType.toLowerCase()} {
            id
          }
        }
      }
    `;
    
    const result = await graphDb.executeMutation(mutation, { fromId, toId });
    
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
 * Handle createScopedConfig update - NEW IMPLEMENTATION
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
    
    // Add scope to config data
    const now = new Date().toISOString();
    const enhancedConfigData = {
      ...configData,
      scope,
      isActive: true,
      createdAt: now,
      modifiedAt: now
    };
    
    // Construct GraphQL mutation to create the config entity
    const mutation = `
      mutation CreateScopedConfig($input: [Add${configType}Input!]!) {
        add${configType}(input: $input) {
          ${configType.toLowerCase()} {
            id
          }
        }
      }
    `;
    
    // Execute mutation to create config entity
    const createResult = await graphDb.executeMutation(mutation, { 
      input: [enhancedConfigData]
    });
    
    if (!createResult || !createResult[`add${configType}`] || !createResult[`add${configType}`][configType.toLowerCase()]) {
      return {
        success: false,
        error: `Failed to create ${configType}`,
        data: null
      };
    }
    
    const configId = createResult[`add${configType}`][configType.toLowerCase()].id;
    
    // Create TimePoint for this creation event
    await createTimePointForEvent(configId, configType, 'CREATION', now);
    
    // If non-DEFAULT scope, create relationship to scope entity
    if (scope !== 'DEFAULT' && scopeEntityId) {
      let scopeEntityType;
      let relationshipField;
      
      switch (scope) {
        case 'USER':
          scopeEntityType = 'User';
          relationshipField = `${configType.toLowerCase()}s`;
          break;
        case 'PROJECT':
          scopeEntityType = 'Project';
          relationshipField = `${configType.toLowerCase()}s`;
          break;
        case 'TEAM':
          scopeEntityType = 'Team';
          relationshipField = `${configType.toLowerCase()}s`;
          break;
        case 'ORG':
          scopeEntityType = 'Organization';
          relationshipField = `${configType.toLowerCase()}s`;
          break;
      }
      
      // Construct GraphQL mutation to create relationship to scope entity
      const relationMutation = `
        mutation LinkToScopeEntity($scopeId: ID!, $configId: ID!) {
          update${scopeEntityType}(input: {
            filter: { id: { eq: $scopeId } },
            set: { ${relationshipField}: [{ id: $configId }] }
          }) {
            ${scopeEntityType.toLowerCase()} {
              id
            }
          }
        }
      `;
      
      // Execute mutation to create relationship
      await graphDb.executeMutation(relationMutation, { 
        scopeId: scopeEntityId, 
        configId 
      });
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
 * Handle createTimePoint update - NEW IMPLEMENTATION
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
    
    // Create TimePoint entity
    const mutation = `
      mutation CreateTimePoint($input: [AddTimePointInput!]!) {
        addTimePoint(input: $input) {
          timePoint {
            id
          }
        }
      }
    `;
    
    const timePointInput = {
      id: timePointId,
      timestamp,
      entityId,
      entityType,
      eventType,
      ...(metadata ? { metadata: JSON.stringify(metadata) } : {})
    };
    
    const result = await graphDb.executeMutation(mutation, { 
      input: [timePointInput]
    });
    
    if (!result || !result.addTimePoint || !result.addTimePoint.timePoint) {
      throw new Error('Failed to create TimePoint');
    }
    
    // Create relationship between TimePoint and the entity
    const relationField = getTimePointRelationField(eventType);
    
    if (relationField) {
      // Update the entity to link to this TimePoint
      const entityMutation = `
        mutation LinkTimePointToEntity($entityId: ID!, $timePointId: ID!) {
          update${entityType}(input: {
            filter: { id: { eq: $entityId } },
            set: { ${relationField}: [{ id: $timePointId }] }
          }) {
            ${entityType.toLowerCase()} {
              id
            }
          }
        }
      `;
      
      await graphDb.executeMutation(entityMutation, { 
        entityId, 
        timePointId 
      });
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

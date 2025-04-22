// src/tools/update_ckg.ts
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { 
  projectSchema, 
  taskSchema, 
  subTaskSchema,
  ruleSchema,
  personaSchema
} from '../types/generated/ckg-schema.js';
import { createGraphQLClientWithFallback } from '../db/dgraph.js';

// Input schema using generated Zod schemas
const updateCkgInputSchema = z.object({
  updateType: z.enum([
    'createNode', 
    'updateNodeProperties', 
    'createRelationship',
    'deleteNode',
    'deleteRelationship'
  ]),
  nodeType: z.enum([
    'Project', 'Task', 'SubTask', 'AgentInstance',
    'Rule', 'Persona', 'Requirement', 'DesignSpec',
    'ArchDecision', 'File', 'Function', 'Class',
    'Interface', 'TestPlan', 'TestCase', 'BugReport',
    'CodeChange', 'HITLInteraction'
  ]),
  nodeData: z.record(z.string(), z.any())
    .optional()
    .describe('Node properties to create or update'),
  nodeId: z.string()
    .optional()
    .describe('ID of the node to update, delete, or connect to'),
  relationshipType: z.string()
    .optional()
    .describe('Type of relationship to create or delete'),
  targetNodeId: z.string()
    .optional()
    .describe('ID of the target node for relationship operations'),
  targetNodeType: z.enum([
    'Project', 'Task', 'SubTask', 'AgentInstance',
    'Rule', 'Persona', 'Requirement', 'DesignSpec',
    'ArchDecision', 'File', 'Function', 'Class',
    'Interface', 'TestPlan', 'TestCase', 'BugReport',
    'CodeChange', 'HITLInteraction'
  ])
    .optional()
    .describe('Type of the target node for relationship operations'),
});

// Output schema
const updateCkgOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  nodeId: z.string().optional(),
  message: z.string(),
  error: z.string().optional(),
});

// Type definitions from schema
type UpdateCkgInput = z.infer<typeof updateCkgInputSchema>;
type UpdateCkgOutput = z.infer<typeof updateCkgOutputSchema>;

/**
 * Update the Code Knowledge Graph
 * 
 * @param input Update parameters
 * @returns Update result
 */
export async function updateCkg(input: UpdateCkgInput): Promise<UpdateCkgOutput> {
  try {
    // Validate input using generated Zod schema
    const validatedInput = updateCkgInputSchema.parse(input);
    
    logger.info('Updating CKG', { input: validatedInput });
    
    // Create GraphQL client with fallback to local implementation
    const client = await createGraphQLClientWithFallback();
    
    // Build mutation based on input
    const { mutation, variables } = buildGraphQLMutation(validatedInput);
    
    // Execute mutation
    const response = await client.request(mutation, variables);
    
    // Parse response to get the node ID if available
    const nodeId = getNodeIdFromResponse(response, validatedInput);
    
    return {
      status: 'success',
      nodeId,
      message: `Successfully ${getOperationDescription(validatedInput)}`,
    };
  } catch (error: unknown) {
    logger.error('Error updating CKG', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return {
      status: 'error',
      message: 'Failed to update CKG',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build a GraphQL mutation from the input parameters
 */
function buildGraphQLMutation(input: UpdateCkgInput): { mutation: string; variables: Record<string, any> } {
  const variables: Record<string, any> = {};
  let mutation = '';
  
  switch (input.updateType) {
    case 'createNode':
      if (!input.nodeData) {
        throw new Error('nodeData is required for createNode operation');
      }
      
      mutation = `
        mutation CreateNode($input: [Add${input.nodeType}Input!]!) {
          add${input.nodeType}(input: $input) {
            ${input.nodeType.toLowerCase()} {
              id
            }
          }
        }
      `;
      variables.input = [input.nodeData];
      break;
    
    case 'updateNodeProperties':
      if (!input.nodeId || !input.nodeData) {
        throw new Error('nodeId and nodeData are required for updateNodeProperties operation');
      }
      
      mutation = `
        mutation UpdateNode($id: ID!, $patch: Update${input.nodeType}Input!) {
          update${input.nodeType}(input: { filter: { id: [$id] }, set: $patch }) {
            ${input.nodeType.toLowerCase()} {
              id
            }
          }
        }
      `;
      variables.id = input.nodeId;
      variables.patch = input.nodeData;
      break;
    
    case 'createRelationship':
      if (!input.nodeId || !input.targetNodeId || !input.relationshipType || !input.targetNodeType) {
        throw new Error('nodeId, targetNodeId, relationshipType, and targetNodeType are required for createRelationship operation');
      }
      
      // This is a simplified approach - actual implementation would depend on the specific relationship
      // and how it's defined in the GraphQL schema
      mutation = `
        mutation CreateRelationship($id: ID!, $targetId: ID!) {
          update${input.nodeType}(input: { 
            filter: { id: [$id] }, 
            set: { ${input.relationshipType}: { id: $targetId } }
          }) {
            ${input.nodeType.toLowerCase()} {
              id
            }
          }
        }
      `;
      variables.id = input.nodeId;
      variables.targetId = input.targetNodeId;
      break;
    
    case 'deleteNode':
      if (!input.nodeId) {
        throw new Error('nodeId is required for deleteNode operation');
      }
      
      mutation = `
        mutation DeleteNode($id: ID!) {
          delete${input.nodeType}(filter: { id: [$id] }) {
            numUids
          }
        }
      `;
      variables.id = input.nodeId;
      break;
    
    case 'deleteRelationship':
      if (!input.nodeId || !input.targetNodeId || !input.relationshipType) {
        throw new Error('nodeId, targetNodeId, and relationshipType are required for deleteRelationship operation');
      }
      
      // This is a simplified approach - actual implementation would depend on the specific relationship
      // and how it's defined in the GraphQL schema
      mutation = `
        mutation DeleteRelationship($id: ID!, $targetId: ID!) {
          update${input.nodeType}(input: { 
            filter: { id: [$id] }, 
            remove: { ${input.relationshipType}: { id: $targetId } }
          }) {
            ${input.nodeType.toLowerCase()} {
              id
            }
          }
        }
      `;
      variables.id = input.nodeId;
      variables.targetId = input.targetNodeId;
      break;
    
    default:
      throw new Error(`Unsupported update type: ${input.updateType}`);
  }
  
  return { mutation, variables };
}

/**
 * Extract the node ID from the GraphQL response
 */
function getNodeIdFromResponse(response: any, input: UpdateCkgInput): string | undefined {
  try {
    // Extract the node ID based on the update type and response structure
    switch (input.updateType) {
      case 'createNode':
        if (response[`add${input.nodeType}`]?.[input.nodeType.toLowerCase()]?.[0]?.id) {
          return response[`add${input.nodeType}`][input.nodeType.toLowerCase()][0].id;
        }
        break;
      
      case 'updateNodeProperties':
      case 'createRelationship':
      case 'deleteRelationship':
        if (response[`update${input.nodeType}`]?.[input.nodeType.toLowerCase()]?.[0]?.id) {
          return response[`update${input.nodeType}`][input.nodeType.toLowerCase()][0].id;
        }
        break;
      
      case 'deleteNode':
        return input.nodeId; // Return the input node ID for delete operations
    }
    
    // If we couldn't find the ID in the expected structure, try to locate it elsewhere
    return locateIdInResponse(response);
  } catch (error: unknown) {
    logger.error('Error extracting node ID from response', { 
      error: error instanceof Error ? error.message : String(error),
      response 
    });
    return undefined;
  }
}

/**
 * Attempt to locate an ID field anywhere in the response object
 */
function locateIdInResponse(obj: any): string | undefined {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }
  
  if (obj.id && typeof obj.id === 'string') {
    return obj.id;
  }
  
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      const id = locateIdInResponse(obj[key]);
      if (id) {
        return id;
      }
    }
  }
  
  return undefined;
}

/**
 * Get a human-readable description of the operation
 */
function getOperationDescription(input: UpdateCkgInput): string {
  switch (input.updateType) {
    case 'createNode':
      return `created ${input.nodeType.toLowerCase()} node`;
    case 'updateNodeProperties':
      return `updated ${input.nodeType.toLowerCase()} node properties`;
    case 'createRelationship':
      return `created relationship between ${input.nodeType.toLowerCase()} and ${input.targetNodeType?.toLowerCase()}`;
    case 'deleteNode':
      return `deleted ${input.nodeType.toLowerCase()} node`;
    case 'deleteRelationship':
      return `deleted relationship between ${input.nodeType.toLowerCase()} and ${input.targetNodeType?.toLowerCase()}`;
    default:
      return 'performed operation';
  }
}

/**
 * Validate node data based on the node type
 */
async function validateNodeData(data: any, nodeType: string): Promise<any> {
  try {
    // Select the appropriate schema based on nodeType
    switch (nodeType) {
      case 'Project':
        return projectSchema.parse(data);
      case 'Task':
        return taskSchema.parse(data);
      case 'SubTask':
        return subTaskSchema.parse(data);
      case 'Rule':
        return ruleSchema.parse(data);
      case 'Persona':
        return personaSchema.parse(data);
      // Add other node types as needed
      default:
        // For unimplemented types, return as is
        return data;
    }
  } catch (error: unknown) {
    logger.error('Error validating node data', { 
      error: error instanceof Error ? error.message : String(error),
      nodeType 
    });
    throw new Error(`Invalid ${nodeType} data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// MCP tool handler
export const updateCkgTool = {
  name: 'update_ckg',
  description: 'Update the Code Knowledge Graph',
  parameters: updateCkgInputSchema,
  handler: updateCkg,
};

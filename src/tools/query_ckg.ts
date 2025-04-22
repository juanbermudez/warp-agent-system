// src/tools/query_ckg.ts
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { projectSchema, taskSchema, Project, Task } from '../types/generated/ckg-schema.js';
import { createGraphQLClientWithFallback } from '../db/dgraph.js';

// Input schema using generated Zod schemas
const queryCkgInputSchema = z.object({
  queryType: z.enum(['getNodeById', 'findNodesByLabel', 'findRelatedNodes', 'keywordSearch', 'vectorSearch']),
  parameters: z.object({
    id: z.string().optional(),
    label: z.string().optional(),
    relationshipType: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    vector: z.array(z.number()).optional(),
    properties: z.array(z.string()).optional(),
    limit: z.number().int().positive().optional(),
  }),
  nodeType: z.enum(['Project', 'Task', 'SubTask', 'File', 'Function', 'Class', 'Interface', 
                    'Requirement', 'DesignSpec', 'ArchDecision', 'Rule', 'Persona', 
                    'TestPlan', 'TestCase', 'BugReport', 'CodeChange', 'HITLInteraction']),
});

// Union of possible output types using generated Zod schemas
const queryCkgOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  results: z.union([
    z.array(projectSchema),
    z.array(taskSchema),
    // Add other schemas as needed
    z.array(z.any()), // Fallback for unspecified types
  ]),
  error: z.string().optional(),
});

// Type definitions from schema
type QueryCkgInput = z.infer<typeof queryCkgInputSchema>;
type QueryCkgOutput = z.infer<typeof queryCkgOutputSchema>;

/**
 * Query the Code Knowledge Graph
 * 
 * @param input Query parameters
 * @returns Query results
 */
export async function queryCkg(input: QueryCkgInput): Promise<QueryCkgOutput> {
  try {
    // Validate input using generated Zod schema
    const validatedInput = queryCkgInputSchema.parse(input);
    
    logger.info('Querying CKG', { input: validatedInput });
    
    // Create GraphQL client with fallback to local implementation
    const client = await createGraphQLClientWithFallback();
    
    // Build query based on input
    const { query, variables } = buildGraphQLQuery(validatedInput);
    
    // Execute query
    const response = await client.request(query, variables);
    
    // Transform and validate response
    const results = transformResults(response, validatedInput.nodeType);
    
    // Validate output data using generated Zod schemas
    const validatedResults = await validateResults(results, validatedInput.nodeType);
    
    return {
      status: 'success',
      results: validatedResults,
    };
  } catch (error: unknown) {
    logger.error('Error querying CKG', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return {
      status: 'error',
      results: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build a GraphQL query from the input parameters
 */
function buildGraphQLQuery(input: QueryCkgInput): { query: string; variables: Record<string, any> } {
  // Implementation details would depend on specific query types
  // This is a simplified example
  
  const variables: Record<string, any> = {};
  let query = '';
  
  switch (input.queryType) {
    case 'getNodeById':
      query = `
        query GetNodeById($id: ID!) {
          get${input.nodeType}(id: $id) {
            id
            name
            description
            # Other fields would be included based on nodeType
          }
        }
      `;
      variables.id = input.parameters.id;
      break;
    
    case 'findNodesByLabel':
      query = `
        query FindNodesByLabel($label: String!, $limit: Int) {
          query${input.nodeType}(filter: { name: { eq: $label } }, first: $limit) {
            id
            name
            description
            # Other fields would be included based on nodeType
          }
        }
      `;
      variables.label = input.parameters.label;
      variables.limit = input.parameters.limit || 10;
      break;
    
    // Other query types would be implemented similarly
    case 'findRelatedNodes':
      query = `
        query FindRelatedNodes($id: ID!, $relationshipType: String!, $limit: Int) {
          get${input.nodeType}(id: $id) {
            id
            ${input.parameters.relationshipType} {
              id
              name
              description
              # Other fields would be included based on nodeType
            }
          }
        }
      `;
      variables.id = input.parameters.id;
      variables.relationshipType = input.parameters.relationshipType;
      variables.limit = input.parameters.limit || 10;
      break;
    
    case 'keywordSearch':
      query = `
        query KeywordSearch($keywords: [String!]!, $limit: Int) {
          query${input.nodeType}(filter: { description: { allOfText: $keywords } }, first: $limit) {
            id
            name
            description
            # Other fields would be included based on nodeType
          }
        }
      `;
      variables.keywords = input.parameters.keywords?.join(' ') || '';
      variables.limit = input.parameters.limit || 10;
      break;
    
    case 'vectorSearch':
      // This would require vector search capabilities in the database
      // Simplified placeholder implementation
      query = `
        query VectorSearch($limit: Int) {
          query${input.nodeType}(first: $limit) {
            id
            name
            description
            # Other fields would be included based on nodeType
          }
        }
      `;
      variables.limit = input.parameters.limit || 10;
      // In a real implementation, this would include vector search parameters
      break;
    
    default:
      throw new Error(`Unsupported query type: ${input.queryType}`);
  }
  
  return { query, variables };
}

/**
 * Transform the GraphQL response to match the expected output format
 */
function transformResults(response: any, nodeType: string): any[] {
  // Extract the results from the response based on the query structure
  // This is a simplified example
  
  if (response[`get${nodeType}`]) {
    // Single node result
    return [response[`get${nodeType}`]];
  } else if (response[`query${nodeType}`]) {
    // Multiple node results
    return response[`query${nodeType}`];
  } else {
    // No results or unexpected structure
    return [];
  }
}

/**
 * Validate the results using the appropriate generated Zod schema
 */
async function validateResults(results: any[], nodeType: string): Promise<any[]> {
  try {
    // Select the appropriate schema based on nodeType
    switch (nodeType) {
      case 'Project':
        return z.array(projectSchema).parse(results);
      case 'Task':
        return z.array(taskSchema).parse(results);
      // Add other node types as needed
      default:
        // For unimplemented types, return as is
        return results;
    }
  } catch (error: unknown) {
    logger.error('Error validating results', { 
      error: error instanceof Error ? error.message : String(error),
      nodeType 
    });
    throw new Error(`Invalid ${nodeType} data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// MCP tool handler example
export const queryCkgTool = {
  name: 'query_ckg',
  description: 'Query the Code Knowledge Graph',
  parameters: queryCkgInputSchema,
  handler: queryCkg,
};

import { z } from 'zod';
import { GraphDatabase } from '../db/dgraph.js';
import { join } from 'path';

// Define validation schemas
const QueryDetails = z.object({
  queryType: z.enum([
    'getNodeById', 
    'findNodesByLabel', 
    'findRelatedNodes', 
    'keywordSearch', 
    'vectorSearch',
    'resolveConfigByScope',
    'findTimeRelatedEvents',
    'getEntityHistory'
  ]),
  parameters: z.record(z.any()),
  requiredProperties: z.array(z.string()).optional(),
});

const ScopeContext = z.object({
  userId: z.string().optional(),
  projectId: z.string().optional(),
  teamId: z.string().optional(),
  orgId: z.string().optional()
}).optional();

const ResultSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  error: z.string().optional(),
});

// Initialize the database connection
const DB_PATH = join(process.cwd(), '.warp_memory');
const graphDb = new GraphDatabase('localhost:9080', DB_PATH);

/**
 * Tool to query the Code Knowledge Graph
 * @param queryDetails Object specifying query type, parameters, and required properties
 * @returns Object containing query results
 */
export async function query_ckg(queryDetails: z.infer<typeof QueryDetails>): Promise<z.infer<typeof ResultSchema>> {
  try {
    // Validate input
    const validatedInput = QueryDetails.parse(queryDetails);
    
    // Initialize database if not already initialized
    await graphDb.initialize();
    
    // Handle different query types
    switch (validatedInput.queryType) {
      case 'getNodeById':
        return handleGetNodeById(validatedInput.parameters, validatedInput.requiredProperties);
      case 'findNodesByLabel':
        return handleFindNodesByLabel(validatedInput.parameters, validatedInput.requiredProperties);
      case 'findRelatedNodes':
        return handleFindRelatedNodes(validatedInput.parameters, validatedInput.requiredProperties);
      case 'keywordSearch':
        return handleKeywordSearch(validatedInput.parameters, validatedInput.requiredProperties);
      case 'vectorSearch':
        return handleVectorSearch(validatedInput.parameters, validatedInput.requiredProperties);
      case 'resolveConfigByScope':
        return handleResolveConfigByScope(validatedInput.parameters);
      case 'findTimeRelatedEvents':
        return handleFindTimeRelatedEvents(validatedInput.parameters);
      case 'getEntityHistory':
        return handleGetEntityHistory(validatedInput.parameters);
      default:
        return {
          success: false,
          error: `Unsupported query type: ${validatedInput.queryType}`,
          data: null
        };
    }
  } catch (error) {
    console.error('Error in query_ckg:', error);
    return {
      success: false,
      error: `Failed to query CKG: ${error.message}`,
      data: null
    };
  }
}

// Handle getNodeById query
async function handleGetNodeById(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { nodeType, id } = parameters;
    
    if (!nodeType || !id) {
      return {
        success: false,
        error: 'nodeType and id are required for getNodeById',
        data: null
      };
    }
    
    // Construct GraphQL query
    const query = `
      query GetNodeById($id: String!) {
        ${nodeType}(id: $id) {
          ${requiredProperties ? requiredProperties.join('\n') : 'id\nname'}
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query, { id });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: `getNodeById failed: ${error.message}`,
      data: null
    };
  }
}

// Handle findNodesByLabel query
async function handleFindNodesByLabel(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { label, filter } = parameters;
    
    if (!label) {
      return {
        success: false,
        error: 'label is required for findNodesByLabel',
        data: null
      };
    }
    
    // Construct GraphQL query
    const query = `
      query FindNodesByLabel($filter: ${label}Filter) {
        ${label}(filter: $filter) {
          ${requiredProperties ? requiredProperties.join('\n') : 'id\nname'}
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query, { filter: filter || {} });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: `findNodesByLabel failed: ${error.message}`,
      data: null
    };
  }
}

// Handle findRelatedNodes query
async function handleFindRelatedNodes(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { nodeType, nodeId, relationType } = parameters;
    
    if (!nodeType || !nodeId) {
      return {
        success: false,
        error: 'nodeType and nodeId are required for findRelatedNodes',
        data: null
      };
    }
    
    const relatedEntities = await graphDb.getRelatedEntities(nodeType, nodeId, relationType);
    
    return {
      success: true,
      data: relatedEntities
    };
  } catch (error) {
    return {
      success: false,
      error: `findRelatedNodes failed: ${error.message}`,
      data: null
    };
  }
}

// Handle keywordSearch query (basic implementation)
async function handleKeywordSearch(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  // For MVP, implement a simplified keyword search
  return {
    success: false,
    error: 'keywordSearch not fully implemented in local database',
    data: null
  };
}

// Handle vectorSearch query (placeholder)
async function handleVectorSearch(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  // Vector search requires additional infrastructure
  return {
    success: false,
    error: 'vectorSearch not supported in local database',
    data: null
  };
}

/**
 * Handle resolveConfigByScope query - NEW IMPLEMENTATION
 * Resolves configuration (rules, workflows, personas) based on scope hierarchy
 */
async function handleResolveConfigByScope(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { contextScope, neededContext } = parameters;
    
    if (!contextScope) {
      return {
        success: false,
        error: 'contextScope is required for resolveConfigByScope',
        data: null
      };
    }
    
    if (!neededContext || !Array.isArray(neededContext) || neededContext.length === 0) {
      return {
        success: false,
        error: 'neededContext is required for resolveConfigByScope',
        data: null
      };
    }
    
    // Define scope hierarchy for resolution (from most specific to least specific)
    const scopeHierarchy = [
      { level: 'USER', id: contextScope.userId },
      { level: 'PROJECT', id: contextScope.projectId },
      { level: 'TEAM', id: contextScope.teamId },
      { level: 'ORG', id: contextScope.orgId },
      { level: 'DEFAULT', id: null }
    ].filter(scope => scope.id !== undefined);
    
    const resolvedConfig: Record<string, any> = {};
    
    // Process each requested context type
    for (const contextType of neededContext) {
      switch (contextType) {
        case 'rules':
          resolvedConfig.rules = await resolveRules(scopeHierarchy);
          break;
        case 'workflow':
          resolvedConfig.workflow = await resolveWorkflow(scopeHierarchy, contextScope.projectId);
          break;
        case 'persona':
          resolvedConfig.persona = await resolvePersona(scopeHierarchy, contextScope.projectId);
          break;
        case 'code_snippets':
          resolvedConfig.code_snippets = await fetchCodeSnippets(contextScope.projectId);
          break;
        default:
          console.warn(`Unknown context type: ${contextType}`);
      }
    }
    
    return {
      success: true,
      data: resolvedConfig
    };
  } catch (error) {
    return {
      success: false,
      error: `resolveConfigByScope failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Resolve rules based on scope hierarchy
 */
async function resolveRules(scopeHierarchy: Array<{ level: string, id: string | null }>): Promise<any> {
  const resolvedRules: Record<string, any> = {};
  const compositionalRules: Record<string, any[]> = {};
  
  // Query for rules at each scope level, starting from most specific
  for (const scope of scopeHierarchy) {
    // Construct a GraphQL query for this scope level
    const query = `
      query GetRulesForScope($level: ScopeLevel!, $id: ID) {
        queryRule(filter: { 
          scope: { eq: $level },
          isActive: { eq: true }
          ${scope.id ? `, appliesTo: { id: { eq: $id } }` : ''}
        }) {
          id
          name
          description
          ruleType
          content
          scope
        }
      }
    `;
    
    try {
      const result = await graphDb.executeQuery(query, {
        level: scope.level,
        id: scope.id
      });
      
      if (result?.queryRule && Array.isArray(result.queryRule)) {
        for (const rule of result.queryRule) {
          // For override rules (e.g., commit message format), only use the most specific
          // If we haven't seen this rule name before, add it
          if (!resolvedRules[rule.name]) {
            resolvedRules[rule.name] = rule;
          }
          
          // For compositional rules (e.g., best practices), collect from all scopes
          if (rule.ruleType === 'CODE_STANDARD' || rule.ruleType === 'SECURITY') {
            if (!compositionalRules[rule.ruleType]) {
              compositionalRules[rule.ruleType] = [];
            }
            compositionalRules[rule.ruleType].push(rule);
          }
        }
      }
    } catch (error) {
      console.error(`Error querying rules for scope ${scope.level}:`, error);
    }
  }
  
  // Return both override and compositional rules
  return {
    overrideRules: resolvedRules,
    compositionalRules
  };
}

/**
 * Resolve workflow based on scope hierarchy
 */
async function resolveWorkflow(scopeHierarchy: Array<{ level: string, id: string | null }>, projectId: string): Promise<any> {
  // For workflows, we want the most specific one that applies
  for (const scope of scopeHierarchy) {
    // Construct a GraphQL query for this scope level
    const query = `
      query GetWorkflowForScope($level: ScopeLevel!, $id: ID, $projectId: ID) {
        queryWorkflow(filter: { 
          scope: { eq: $level },
          isActive: { eq: true }
          ${scope.id ? `, appliesTo: { id: { eq: $id } }` : ''}
          ${projectId ? `, appliesTo: { id: { eq: $projectId } }` : ''}
        }) {
          id
          name
          description
          appliesToTaskType
          scope
          steps {
            id
            name
            description
            stepOrder
            requiredRole
            expectedSubTaskType
            isOptional
            nextStep {
              id
            }
          }
        }
      }
    `;
    
    try {
      const result = await graphDb.executeQuery(query, {
        level: scope.level,
        id: scope.id,
        projectId: projectId
      });
      
      if (result?.queryWorkflow && Array.isArray(result.queryWorkflow) && result.queryWorkflow.length > 0) {
        // Found a workflow at this scope, use it and stop looking at broader scopes
        return result.queryWorkflow[0];
      }
    } catch (error) {
      console.error(`Error querying workflow for scope ${scope.level}:`, error);
    }
  }
  
  // If no workflow found at any scope, return null
  return null;
}

/**
 * Resolve persona based on scope hierarchy
 */
async function resolvePersona(scopeHierarchy: Array<{ level: string, id: string | null }>, projectId: string): Promise<any> {
  // For personas, we want the most specific one that applies
  for (const scope of scopeHierarchy) {
    // Construct a GraphQL query for this scope level
    const query = `
      query GetPersonaForScope($level: ScopeLevel!, $id: ID, $projectId: ID) {
        queryPersona(filter: { 
          scope: { eq: $level },
          isActive: { eq: true }
          ${scope.id ? `, appliesTo: { id: { eq: $id } }` : ''}
          ${projectId ? `, project: { id: { eq: $projectId } }` : ''}
        }) {
          id
          role
          description
          promptTemplate
          scope
        }
      }
    `;
    
    try {
      const result = await graphDb.executeQuery(query, {
        level: scope.level,
        id: scope.id,
        projectId: projectId
      });
      
      if (result?.queryPersona && Array.isArray(result.queryPersona) && result.queryPersona.length > 0) {
        // Found a persona at this scope, use it and stop looking at broader scopes
        return result.queryPersona[0];
      }
    } catch (error) {
      console.error(`Error querying persona for scope ${scope.level}:`, error);
    }
  }
  
  // If no persona found at any scope, return null
  return null;
}

/**
 * Fetch code snippets for context
 */
async function fetchCodeSnippets(projectId: string): Promise<any[]> {
  if (!projectId) return [];
  
  // Construct a GraphQL query to get files and relevant code entities
  const query = `
    query GetCodeSnippets($projectId: ID!) {
      getProject(id: $projectId) {
        files {
          path
          content
          functions {
            name
            signature
          }
          classes {
            name
            methods {
              name
              signature
            }
          }
        }
      }
    }
  `;
  
  try {
    const result = await graphDb.executeQuery(query, { projectId });
    return result?.getProject?.files || [];
  } catch (error) {
    console.error(`Error fetching code snippets for project ${projectId}:`, error);
    return [];
  }
}

/**
 * Handle findTimeRelatedEvents query - NEW IMPLEMENTATION
 * Finds events that occurred within a specified time window
 */
async function handleFindTimeRelatedEvents(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { startTime, endTime, eventTypes, entityTypes } = parameters;
    
    if (!startTime || !endTime) {
      return {
        success: false,
        error: 'startTime and endTime are required for findTimeRelatedEvents',
        data: null
      };
    }
    
    // Build filter conditions
    let eventTypeFilter = '';
    if (eventTypes && Array.isArray(eventTypes) && eventTypes.length > 0) {
      eventTypeFilter = `, eventType: { in: [${eventTypes.map(t => `"${t}"`).join(', ')}] }`;
    }
    
    let entityTypeFilter = '';
    if (entityTypes && Array.isArray(entityTypes) && entityTypes.length > 0) {
      entityTypeFilter = `, entityType: { in: [${entityTypes.map(t => `"${t}"`).join(', ')}] }`;
    }
    
    // Construct GraphQL query
    const query = `
      query FindTimeRelatedEvents($startTime: DateTime!, $endTime: DateTime!) {
        queryTimePoint(filter: { 
          timestamp: { ge: $startTime, le: $endTime }
          ${eventTypeFilter}
          ${entityTypeFilter}
        }, order: { asc: timestamp }) {
          id
          timestamp
          eventType
          entityId
          entityType
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query, { startTime, endTime });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: `findTimeRelatedEvents failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle getEntityHistory query - NEW IMPLEMENTATION
 * Gets the history of events for a specific entity
 */
async function handleGetEntityHistory(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { entityId, entityType, startTime, endTime } = parameters;
    
    if (!entityId || !entityType) {
      return {
        success: false,
        error: 'entityId and entityType are required for getEntityHistory',
        data: null
      };
    }
    
    // Build filter conditions for time window
    let timeFilter = '';
    if (startTime && endTime) {
      timeFilter = `, timestamp: { ge: $startTime, le: $endTime }`;
    } else if (startTime) {
      timeFilter = `, timestamp: { ge: $startTime }`;
    } else if (endTime) {
      timeFilter = `, timestamp: { le: $endTime }`;
    }
    
    // Construct GraphQL query
    const query = `
      query GetEntityHistory($entityId: String!, $startTime: DateTime, $endTime: DateTime) {
        queryTimePoint(filter: { 
          entityId: { eq: $entityId }
          entityType: { eq: "${entityType}" }
          ${timeFilter}
        }, order: { asc: timestamp }) {
          id
          timestamp
          eventType
        }
        
        # Also retrieve the entity itself to get current state
        get${entityType}(id: $entityId) {
          id
          name
          ${entityType === 'Task' ? 'status' : ''}
          ${entityType === 'Task' ? 'taskLevel' : ''}
          createdAt
          ${entityType !== 'TimePoint' ? 'modifiedAt' : ''}
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query, { entityId, startTime, endTime });
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: `getEntityHistory failed: ${error.message}`,
      data: null
    };
  }
}

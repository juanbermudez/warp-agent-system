/**
 * Query CKG Tool - Enhanced Dgraph Implementation
 * 
 * This tool provides a unified interface for querying the Code Knowledge Graph,
 * leveraging Dgraph's native graph capabilities with a local fallback option.
 */

import { z } from 'zod';
import { GraphDatabase } from '../db/dgraph';
import { join } from 'path';
import NodeCache from 'node-cache';

// Define validation schemas
const QueryDetails = z.object({
  queryType: z.enum([
    'getNodeById', 
    'findNodesByLabel', 
    'findRelatedNodes', 
    'keywordSearch', 
    'vectorSearch',
    'traversePath',
    'aggregateData',
    'resolveConfigByScope',
    'findTimeRelatedEvents',
    'getEntityHistory'
  ]),
  parameters: z.record(z.any()),
  requiredProperties: z.array(z.string()).optional(),
  cacheOptions: z.object({
    useCache: z.boolean().default(true),
    ttlSeconds: z.number().default(300)
  }).optional()
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
  source: z.enum(['dgraph', 'local', 'cache']).optional(),
  timing: z.object({
    queryTimeMs: z.number()
  }).optional()
});

// Initialize the database connection
const DB_PATH = process.env.WARP_LOCAL_DB_PATH || join(process.cwd(), '.warp_memory');
const DGRAPH_URL = process.env.WARP_DGRAPH_URL || 'localhost:9080';
const graphDb = new GraphDatabase(DGRAPH_URL, DB_PATH);

// Initialize cache
const cache = new NodeCache({ 
  stdTTL: 300,  // 5 minutes default TTL
  checkperiod: 60,
  useClones: false
});

/**
 * Tool to query the Code Knowledge Graph
 * @param queryDetails Object specifying query type, parameters, and required properties
 * @returns Object containing query results
 */
export async function query_ckg(queryDetails: z.infer<typeof QueryDetails>): Promise<z.infer<typeof ResultSchema>> {
  const startTime = Date.now();
  
  try {
    // Validate input
    const validatedInput = QueryDetails.parse(queryDetails);
    
    // Check cache if enabled
    const cacheOptions = validatedInput.cacheOptions || { useCache: true, ttlSeconds: 300 };
    const cacheKey = getCacheKey(validatedInput);
    
    if (cacheOptions.useCache) {
      const cachedResult = cache.get(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
          source: 'cache',
          timing: {
            queryTimeMs: Date.now() - startTime
          }
        };
      }
    }
    
    // Initialize database if not already initialized
    await graphDb.initialize();
    
    // Execute query based on type
    let result;
    let source: 'dgraph' | 'local' = 'dgraph';
    
    try {
      // Handle different query types
      switch (validatedInput.queryType) {
        case 'getNodeById':
          result = await handleGetNodeById(validatedInput.parameters, validatedInput.requiredProperties);
          break;
          
        case 'findNodesByLabel':
          result = await handleFindNodesByLabel(validatedInput.parameters, validatedInput.requiredProperties);
          break;
          
        case 'findRelatedNodes':
          result = await handleFindRelatedNodes(validatedInput.parameters, validatedInput.requiredProperties);
          break;
          
        case 'keywordSearch':
          result = await handleKeywordSearch(validatedInput.parameters, validatedInput.requiredProperties);
          break;
          
        case 'vectorSearch':
          result = await handleVectorSearch(validatedInput.parameters, validatedInput.requiredProperties);
          break;
          
        case 'traversePath':
          result = await handleTraversePath(validatedInput.parameters, validatedInput.requiredProperties);
          break;
          
        case 'aggregateData':
          result = await handleAggregateData(validatedInput.parameters);
          break;
          
        case 'resolveConfigByScope':
          result = await handleResolveConfigByScope(validatedInput.parameters);
          break;
          
        case 'findTimeRelatedEvents':
          result = await handleFindTimeRelatedEvents(validatedInput.parameters);
          break;
          
        case 'getEntityHistory':
          result = await handleGetEntityHistory(validatedInput.parameters);
          break;
          
        default:
          return {
            success: false,
            error: `Unsupported query type: ${validatedInput.queryType}`,
            data: null,
            timing: {
              queryTimeMs: Date.now() - startTime
            }
          };
      }
    } catch (error) {
      if (error.message && error.message.includes('local')) {
        source = 'local';
      }
      throw error;
    }
    
    // Cache result if caching is enabled
    if (cacheOptions.useCache && result && result.success) {
      cache.set(cacheKey, result.data, cacheOptions.ttlSeconds);
    }
    
    return {
      success: true,
      data: result.data,
      source,
      timing: {
        queryTimeMs: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('Error in query_ckg:', error);
    return {
      success: false,
      error: `Failed to query CKG: ${error.message}`,
      data: null,
      timing: {
        queryTimeMs: Date.now() - startTime
      }
    };
  }
}

/**
 * Generate cache key from query details
 * @param queryDetails Query details object
 * @returns String cache key
 */
function getCacheKey(queryDetails: z.infer<typeof QueryDetails>): string {
  return `${queryDetails.queryType}:${JSON.stringify(queryDetails.parameters)}:${JSON.stringify(queryDetails.requiredProperties || [])}`;
}

/**
 * Handle getNodeById query
 * @param parameters Query parameters
 * @param requiredProperties Properties to include in result
 * @returns Query result
 */
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
      query GetNodeById($id: string) {
        getNode(func: uid($id)) @filter(type(${nodeType})) {
          uid
          dgraph.type
          ${formatRequiredProperties(nodeType, requiredProperties)}
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query, { $id: id });
    
    if (!result.getNode || result.getNode.length === 0) {
      return {
        success: true,
        data: null
      };
    }
    
    return {
      success: true,
      data: result.getNode[0]
    };
  } catch (error) {
    return {
      success: false,
      error: `getNodeById failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle findNodesByLabel query
 * @param parameters Query parameters
 * @param requiredProperties Properties to include in result
 * @returns Query result
 */
async function handleFindNodesByLabel(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { label, filter, limit = 10, offset = 0 } = parameters;
    
    if (!label) {
      return {
        success: false,
        error: 'label is required for findNodesByLabel',
        data: null
      };
    }
    
    // Construct filter conditions
    let filterConditions = '';
    if (filter && typeof filter === 'object') {
      const conditions = [];
      
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'string') {
            conditions.push(`eq(${label}.${key}, "${value}")`);
          } else {
            conditions.push(`eq(${label}.${key}, ${value})`);
          }
        }
      }
      
      if (conditions.length > 0) {
        filterConditions = `@filter(${conditions.join(' AND ')})`;
      }
    }
    
    // Construct DQL query
    const query = `
      query FindNodesByLabel {
        nodes(func: type(${label}), first: ${limit}, offset: ${offset}) ${filterConditions} {
          uid
          dgraph.type
          ${formatRequiredProperties(label, requiredProperties)}
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query);
    
    return {
      success: true,
      data: result.nodes || []
    };
  } catch (error) {
    return {
      success: false,
      error: `findNodesByLabel failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle findRelatedNodes query
 * @param parameters Query parameters
 * @param requiredProperties Properties to include in result
 * @returns Query result
 */
async function handleFindRelatedNodes(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { nodeType, nodeId, relationType, targetType, limit = 50 } = parameters;
    
    if (!nodeType || !nodeId) {
      return {
        success: false,
        error: 'nodeType and nodeId are required for findRelatedNodes',
        data: null
      };
    }
    
    let query;
    
    if (relationType && targetType) {
      // Get related nodes of specific type through specific relationship
      query = `
        query FindRelatedNodes($nodeId: string) {
          related(func: uid($nodeId)) @filter(type(${nodeType})) {
            ${nodeType}.${relationType} @filter(type(${targetType})) (first: ${limit}) {
              uid
              dgraph.type
              ${formatRequiredProperties(targetType, requiredProperties)}
            }
          }
        }
      `;
    } else if (relationType) {
      // Get all nodes related through specific relationship
      query = `
        query FindRelatedNodes($nodeId: string) {
          related(func: uid($nodeId)) @filter(type(${nodeType})) {
            ${nodeType}.${relationType} (first: ${limit}) {
              uid
              dgraph.type
              expand(_all_)
            }
          }
        }
      `;
    } else {
      // Get all relationships and related nodes
      query = `
        query FindRelatedNodes($nodeId: string) {
          related(func: uid($nodeId)) @filter(type(${nodeType})) {
            uid
            dgraph.type
            expand(out) {
              uid
              dgraph.type
              expand(_all_)
            }
          }
        }
      `;
    }
    
    const result = await graphDb.executeQuery(query, { $nodeId: nodeId });
    
    // Process the results based on query type
    let relatedNodes = [];
    
    if (result.related && result.related.length > 0) {
      if (relationType && targetType) {
        relatedNodes = result.related[0][`${nodeType}.${relationType}`] || [];
      } else if (relationType) {
        relatedNodes = result.related[0][`${nodeType}.${relationType}`] || [];
      } else {
        // Process all relationships
        const node = result.related[0];
        const relationships = {};
        
        for (const [key, value] of Object.entries(node)) {
          if (key !== 'uid' && key !== 'dgraph.type' && Array.isArray(value)) {
            relationships[key.replace(`${nodeType}.`, '')] = value;
          }
        }
        
        relatedNodes = relationships;
      }
    }
    
    return {
      success: true,
      data: relatedNodes
    };
  } catch (error) {
    return {
      success: false,
      error: `findRelatedNodes failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle keywordSearch query
 * @param parameters Query parameters
 * @param requiredProperties Properties to include in result
 * @returns Query result
 */
async function handleKeywordSearch(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { types, keyword, limit = 10 } = parameters;
    
    if (!keyword) {
      return {
        success: false,
        error: 'keyword is required for keywordSearch',
        data: null
      };
    }
    
    if (!types || !Array.isArray(types) || types.length === 0) {
      return {
        success: false,
        error: 'types array is required for keywordSearch',
        data: null
      };
    }
    
    const typeFilter = types.map(type => `type(${type})`).join(' OR ');
    
    // Construct DQL query
    const query = `
      query KeywordSearch($keyword: string) {
        search(func: anyoftext(., $keyword), first: ${limit}) @filter(${typeFilter}) {
          uid
          dgraph.type
          expand(_all_)
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query, { $keyword: keyword });
    
    return {
      success: true,
      data: result.search || []
    };
  } catch (error) {
    return {
      success: false,
      error: `keywordSearch failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle vectorSearch query
 * @param parameters Query parameters
 * @param requiredProperties Properties to include in result
 * @returns Query result
 */
async function handleVectorSearch(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { vector, field, types, limit = 10 } = parameters;
    
    if (!vector || !Array.isArray(vector)) {
      return {
        success: false,
        error: 'vector array is required for vectorSearch',
        data: null
      };
    }
    
    if (!field) {
      return {
        success: false,
        error: 'field is required for vectorSearch',
        data: null
      };
    }
    
    let typeFilter = '';
    if (types && Array.isArray(types) && types.length > 0) {
      typeFilter = ` @filter(${types.map(type => `type(${type})`).join(' OR ')})`;
    }
    
    // Try to use the GraphDatabase vectorSearch method
    try {
      const results = await graphDb.vectorSearch(vector, field, limit);
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      // Fallback to standard error response
      return {
        success: false,
        error: `vectorSearch failed: ${error.message}`,
        data: null
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `vectorSearch failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle traversePath query
 * @param parameters Query parameters
 * @param requiredProperties Properties to include in result
 * @returns Query result
 */
async function handleTraversePath(parameters: Record<string, any>, requiredProperties?: string[]): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { startNodeId, endNodeId, relationTypes, maxDepth = 3 } = parameters;
    
    if (!startNodeId || !endNodeId) {
      return {
        success: false,
        error: 'startNodeId and endNodeId are required for traversePath',
        data: null
      };
    }
    
    // Construct path query
    // This is a simplified implementation - full path finding requires
    // more complex query construction or custom Dgraph logic
    
    let relationFilter = '';
    if (relationTypes && Array.isArray(relationTypes) && relationTypes.length > 0) {
      // Construct a filter for specified relationship types
      const relations = relationTypes.map(rel => `edge(${rel})`).join(' OR ');
      relationFilter = ` @filter(${relations})`;
    }
    
    const query = `
      query FindPath($startId: string, $endId: string) {
        path as shortest(from: $startId, to: $endId, depth: ${maxDepth}) {
          path${relationFilter}
        }
        path() {
          uid
          dgraph.type
          expand(_all_)
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query, { 
      $startId: startNodeId,
      $endId: endNodeId
    });
    
    return {
      success: true,
      data: result.path || []
    };
  } catch (error) {
    return {
      success: false,
      error: `traversePath failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle aggregateData query
 * @param parameters Query parameters
 * @returns Query result
 */
async function handleAggregateData(parameters: Record<string, any>): Promise<z.infer<typeof ResultSchema>> {
  try {
    const { nodeType, groupBy, aggregateField, aggregateFunction } = parameters;
    
    if (!nodeType || !groupBy || !aggregateField || !aggregateFunction) {
      return {
        success: false,
        error: 'nodeType, groupBy, aggregateField, and aggregateFunction are required for aggregateData',
        data: null
      };
    }
    
    // Validate aggregate function
    if (!['count', 'min', 'max', 'sum', 'avg'].includes(aggregateFunction)) {
      return {
        success: false,
        error: `Unsupported aggregate function: ${aggregateFunction}`,
        data: null
      };
    }
    
    // Construct DQL query with groupby
    const query = `
      query AggregateData {
        aggregate(func: type(${nodeType})) {
          groupby(${nodeType}.${groupBy}) {
            ${nodeType}.${groupBy}
            ${aggregateFunction}(${nodeType}.${aggregateField})
          }
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query);
    
    return {
      success: true,
      data: result.aggregate || []
    };
  } catch (error) {
    return {
      success: false,
      error: `aggregateData failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Handle resolveConfigByScope query
 * @param parameters Query parameters
 * @returns Query result
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
 * @param scopeHierarchy Array of scope levels and IDs
 * @returns Resolved rules
 */
async function resolveRules(scopeHierarchy: Array<{ level: string, id: string | null }>): Promise<any> {
  const resolvedRules: Record<string, any> = {};
  const compositionalRules: Record<string, any[]> = {};
  
  // Query for rules at each scope level, starting from most specific
  for (const scope of scopeHierarchy) {
    // Construct a query for this scope level
    const query = `
      query GetRulesForScope($level: string, $id: string) {
        rules(func: type(Rule)) @filter(eq(Rule.scope, $level) AND eq(Rule.isActive, true)${scope.id ? ` AND uid_in(Rule.appliesTo, $id)` : ''}) {
          uid
          Rule.name
          Rule.description
          Rule.ruleType
          Rule.content
          Rule.scope
        }
      }
    `;
    
    try {
      const result = await graphDb.executeQuery(query, {
        $level: scope.level,
        $id: scope.id
      });
      
      if (result.rules && Array.isArray(result.rules)) {
        for (const rule of result.rules) {
          // For override rules (e.g., commit message format), only use the most specific
          // If we haven't seen this rule name before, add it
          if (!resolvedRules[rule['Rule.name']]) {
            resolvedRules[rule['Rule.name']] = {
              id: rule.uid,
              name: rule['Rule.name'],
              description: rule['Rule.description'],
              ruleType: rule['Rule.ruleType'],
              content: rule['Rule.content'],
              scope: rule['Rule.scope']
            };
          }
          
          // For compositional rules (e.g., best practices), collect from all scopes
          if (rule['Rule.ruleType'] === 'CODE_STANDARD' || rule['Rule.ruleType'] === 'SECURITY') {
            if (!compositionalRules[rule['Rule.ruleType']]) {
              compositionalRules[rule['Rule.ruleType']] = [];
            }
            compositionalRules[rule['Rule.ruleType']].push({
              id: rule.uid,
              name: rule['Rule.name'],
              description: rule['Rule.description'],
              content: rule['Rule.content'],
              scope: rule['Rule.scope']
            });
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
 * @param scopeHierarchy Array of scope levels and IDs
 * @param projectId Project ID
 * @returns Resolved workflow
 */
async function resolveWorkflow(scopeHierarchy: Array<{ level: string, id: string | null }>, projectId: string): Promise<any> {
  // For workflows, we want the most specific one that applies
  for (const scope of scopeHierarchy) {
    // Construct a query for this scope level
    const query = `
      query GetWorkflowForScope($level: string, $id: string, $projectId: string) {
        workflows(func: type(Workflow)) @filter(eq(Workflow.scope, $level) AND eq(Workflow.isActive, true)${scope.id ? ` AND uid_in(Workflow.appliesTo, $id)` : ''}${projectId ? ` AND uid_in(Workflow.appliesTo, $projectId)` : ''}) {
          uid
          Workflow.name
          Workflow.description
          Workflow.appliesToTaskType
          Workflow.scope
          Workflow.steps {
            uid
            WorkflowStep.name
            WorkflowStep.description
            WorkflowStep.stepOrder
            WorkflowStep.requiredRole
            WorkflowStep.expectedSubTaskType
            WorkflowStep.isOptional
            WorkflowStep.nextStep {
              uid
            }
          }
        }
      }
    `;
    
    try {
      const result = await graphDb.executeQuery(query, {
        $level: scope.level,
        $id: scope.id,
        $projectId: projectId
      });
      
      if (result.workflows && Array.isArray(result.workflows) && result.workflows.length > 0) {
        // Found a workflow at this scope, use it and stop looking at broader scopes
        const workflow = result.workflows[0];
        
        // Transform result to a more friendly format
        return {
          id: workflow.uid,
          name: workflow['Workflow.name'],
          description: workflow['Workflow.description'],
          appliesToTaskType: workflow['Workflow.appliesToTaskType'],
          scope: workflow['Workflow.scope'],
          steps: (workflow['Workflow.steps'] || []).map(step => ({
            id: step.uid,
            name: step['WorkflowStep.name'],
            description: step['WorkflowStep.description'],
            stepOrder: step['WorkflowStep.stepOrder'],
            requiredRole: step['WorkflowStep.requiredRole'],
            expectedSubTaskType: step['WorkflowStep.expectedSubTaskType'],
            isOptional: step['WorkflowStep.isOptional'],
            nextStep: step['WorkflowStep.nextStep'] ? { id: step['WorkflowStep.nextStep'].uid } : null
          })).sort((a, b) => a.stepOrder - b.stepOrder)
        };
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
 * @param scopeHierarchy Array of scope levels and IDs
 * @param projectId Project ID
 * @returns Resolved persona
 */
async function resolvePersona(scopeHierarchy: Array<{ level: string, id: string | null }>, projectId: string): Promise<any> {
  // For personas, we want the most specific one that applies
  for (const scope of scopeHierarchy) {
    // Construct a query for this scope level
    const query = `
      query GetPersonaForScope($level: string, $id: string, $projectId: string) {
        personas(func: type(Persona)) @filter(eq(Persona.scope, $level) AND eq(Persona.isActive, true)${scope.id ? ` AND uid_in(Persona.appliesTo, $id)` : ''}${projectId ? ` AND uid_in(Persona.project, $projectId)` : ''}) {
          uid
          Persona.role
          Persona.description
          Persona.promptTemplate
          Persona.scope
        }
      }
    `;
    
    try {
      const result = await graphDb.executeQuery(query, {
        $level: scope.level,
        $id: scope.id,
        $projectId: projectId
      });
      
      if (result.personas && Array.isArray(result.personas) && result.personas.length > 0) {
        // Found a persona at this scope, use it and stop looking at broader scopes
        const persona = result.personas[0];
        
        return {
          id: persona.uid,
          role: persona['Persona.role'],
          description: persona['Persona.description'],
          promptTemplate: persona['Persona.promptTemplate'],
          scope: persona['Persona.scope']
        };
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
 * @param projectId Project ID
 * @returns Array of code snippets
 */
async function fetchCodeSnippets(projectId: string): Promise<any[]> {
  if (!projectId) return [];
  
  // Construct a query to get files and relevant code entities
  const query = `
    query GetCodeSnippets($projectId: string) {
      files(func: uid_in(Project.files, $projectId)) {
        uid
        File.path
        File.content
        File.functions {
          uid
          Function.name
          Function.signature
        }
        File.classes {
          uid
          Class.name
          Class.methods {
            uid
            Function.name
            Function.signature
          }
        }
      }
    }
  `;
  
  try {
    const result = await graphDb.executeQuery(query, { $projectId: projectId });
    
    if (!result.files || !Array.isArray(result.files)) {
      return [];
    }
    
    // Transform to a more friendly format
    return result.files.map(file => ({
      path: file['File.path'],
      content: file['File.content'],
      functions: (file['File.functions'] || []).map(fn => ({
        name: fn['Function.name'],
        signature: fn['Function.signature']
      })),
      classes: (file['File.classes'] || []).map(cls => ({
        name: cls['Class.name'],
        methods: (cls['Class.methods'] || []).map(method => ({
          name: method['Function.name'],
          signature: method['Function.signature']
        }))
      }))
    }));
  } catch (error) {
    console.error(`Error fetching code snippets for project ${projectId}:`, error);
    return [];
  }
}

/**
 * Handle findTimeRelatedEvents query
 * @param parameters Query parameters
 * @returns Query result
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
    let filter = 'between(TimePoint.timestamp, $startTime, $endTime)';
    
    if (eventTypes && Array.isArray(eventTypes) && eventTypes.length > 0) {
      filter += ` AND (${eventTypes.map(type => `eq(TimePoint.eventType, "${type}")`)
        .join(' OR ')})`;
    }
    
    if (entityTypes && Array.isArray(entityTypes) && entityTypes.length > 0) {
      filter += ` AND (${entityTypes.map(type => `eq(TimePoint.entityType, "${type}")`)
        .join(' OR ')})`;
    }
    
    // Construct query
    const query = `
      query FindTimeRelatedEvents($startTime: datetime, $endTime: datetime) {
        timepoints(func: type(TimePoint)) @filter(${filter}) {
          uid
          TimePoint.timestamp
          TimePoint.eventType
          TimePoint.entityId
          TimePoint.entityType
          TimePoint.metadata
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query, { 
      $startTime: startTime,
      $endTime: endTime
    });
    
    // Transform results to a more friendly format
    const transformedTimepoints = (result.timepoints || []).map(tp => ({
      id: tp.uid,
      timestamp: tp['TimePoint.timestamp'],
      eventType: tp['TimePoint.eventType'],
      entityId: tp['TimePoint.entityId'],
      entityType: tp['TimePoint.entityType'],
      metadata: tp['TimePoint.metadata']
    })).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return {
      success: true,
      data: transformedTimepoints
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
 * Handle getEntityHistory query
 * @param parameters Query parameters
 * @returns Query result
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
      timeFilter = ` AND between(TimePoint.timestamp, $startTime, $endTime)`;
    } else if (startTime) {
      timeFilter = ` AND ge(TimePoint.timestamp, $startTime)`;
    } else if (endTime) {
      timeFilter = ` AND le(TimePoint.timestamp, $endTime)`;
    }
    
    // Construct query to get timepoints
    const timepointsQuery = `
      query GetEntityTimepoints($entityId: string, $startTime: datetime, $endTime: datetime) {
        timepoints(func: type(TimePoint)) @filter(eq(TimePoint.entityId, $entityId) AND eq(TimePoint.entityType, $entityType)${timeFilter}) {
          uid
          TimePoint.timestamp
          TimePoint.eventType
          TimePoint.metadata
        }
      }
    `;
    
    // Construct query to get entity
    const entityQuery = `
      query GetEntity($entityId: string) {
        entity(func: uid($entityId)) {
          uid
          dgraph.type
          expand(_all_)
        }
      }
    `;
    
    // Execute both queries
    const [timepointsResult, entityResult] = await Promise.all([
      graphDb.executeQuery(timepointsQuery, { 
        $entityId: entityId,
        $startTime: startTime,
        $endTime: endTime
      }),
      graphDb.executeQuery(entityQuery, { $entityId: entityId })
    ]);
    
    // Transform timepoints
    const timepoints = (timepointsResult.timepoints || []).map(tp => ({
      id: tp.uid,
      timestamp: tp['TimePoint.timestamp'],
      eventType: tp['TimePoint.eventType'],
      metadata: tp['TimePoint.metadata']
    })).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return {
      success: true,
      data: {
        entity: entityResult.entity && entityResult.entity.length > 0 
          ? entityResult.entity[0] 
          : null,
        timepoints
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `getEntityHistory failed: ${error.message}`,
      data: null
    };
  }
}

/**
 * Format required properties for query
 * @param nodeType Node type
 * @param properties Array of properties
 * @returns Formatted properties string
 */
function formatRequiredProperties(nodeType: string, properties?: string[]): string {
  if (!properties || properties.length === 0) {
    // Return a reasonable default if no properties specified
    return `
      ${nodeType}.name
      ${nodeType}.id
      ${nodeType}.description
    `;
  }
  
  return properties
    .map(prop => `${nodeType}.${prop}`)
    .join('\n');
}

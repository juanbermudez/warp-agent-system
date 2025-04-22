// src/db/local-graph.ts
import { logger } from '../utils/logger.js';
import { promises as fs } from 'fs';
import path from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { SchemaCheckResult } from './schema/schema-types.js';
import { config } from '../config.js';

// Create a directory for our database files
const DB_DIR = path.join(process.cwd(), '.warp_memory', 'local_db');

// Define the database schema interfaces
interface SchemaData {
  id: string;
  content: string;
  updatedAt: string;
}

interface EntityData {
  [id: string]: any;
}

// Main database data structure
interface DatabaseData {
  [collection: string]: EntityData | SchemaData[];
}

// Ensure the DB directory exists
async function ensureDbDir() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch (error: unknown) {
    logger.error('Failed to create local DB directory', { 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}

// Store adapters and instances
const stores: Record<string, Low<DatabaseData>> = {};

/**
 * Get a database store for a specific node type
 * 
 * @param nodeType The type of node to get a store for
 * @returns A LowDB store for the given node type
 */
export async function getStore(nodeType: string): Promise<Low<DatabaseData>> {
  // Get the base entity type name by removing any operation prefixes
  const baseType = nodeType.replace(/^(get|query|add|update|delete)/, '');
  
  if (!stores[baseType]) {
    const dbPath = path.join(DB_DIR, `${baseType.toLowerCase()}.json`);
    
    // Create adapter for the JSON file
    const adapter = new JSONFile<DatabaseData>(dbPath);
    const store = new Low<DatabaseData>(adapter, {});
    
    // Initialize the store
    await store.read();
    
    // Set default empty state if no data exists
    store.data ||= {};
    if (!store.data[baseType]) {
      store.data[baseType] = {};
      await store.write();
    }
    
    stores[baseType] = store;
    logger.info(`Created local store for ${baseType}`, { dbPath });
  }
  
  return stores[baseType];
}

/**
 * Local implementation of a GraphQL client for the CKG
 */
export class LocalGraphClient {
  /**
   * Execute a GraphQL query against the local database
   * 
   * @param query GraphQL query string
   * @param variables Query variables
   * @returns Query result
   */
  async request(query: string, variables?: Record<string, any>): Promise<any> {
    try {
      logger.debug('Executing GraphQL query against local database', { query, variables });
      
      // Extract operation type and entity type from query
      const operationType = this.extractOperationType(query);
      const entityType = this.extractEntityType(query, operationType);
      
      if (!entityType) {
        throw new Error('Unable to determine entity type from query');
      }
      
      const baseEntityType = this.getBaseEntityType(entityType);
      
      // Execute the appropriate operation
      switch (operationType) {
        case 'query':
          return await this.executeQuery(query, variables, entityType, baseEntityType);
        case 'mutation':
          return await this.executeMutation(query, variables, entityType, baseEntityType);
        default:
          throw new Error(`Unsupported operation type: ${operationType}`);
      }
    } catch (error: unknown) {
      logger.error('Error executing GraphQL query against local database', { 
        error: error instanceof Error ? error.message : String(error),
        query,
        variables
      });
      throw error;
    }
  }
  
  /**
   * Extract the operation type from a GraphQL query
   * 
   * @param query GraphQL query string
   * @returns Operation type (query or mutation)
   */
  private extractOperationType(query: string): string {
    const queryTrimmed = query.trim();
    
    if (queryTrimmed.startsWith('mutation')) {
      return 'mutation';
    } else if (queryTrimmed.startsWith('query') || !queryTrimmed.startsWith('mutation')) {
      return 'query';
    } else {
      throw new Error('Unable to determine operation type from query');
    }
  }
  
  /**
   * Extract the entity type from a GraphQL query
   * 
   * @param query GraphQL query string
   * @param operationType Operation type (query or mutation)
   * @returns Entity type
   */
  private extractEntityType(query: string, operationType: string): string | undefined {
    try {
      if (operationType === 'query') {
        // Look for get<Type> or query<Type> patterns
        const getMatch = query.match(/get(\w+)\s*\(/i);
        if (getMatch) {
          return 'get' + getMatch[1];
        }
        
        const queryMatch = query.match(/query(\w+)\s*\(/i);
        if (queryMatch) {
          return 'query' + queryMatch[1];
        }
      } else if (operationType === 'mutation') {
        // Match add/update/delete patterns
        const addMatch = query.match(/add(\w+)\s*\(/i);
        if (addMatch) {
          return 'add' + addMatch[1];
        }
        
        const updateMatch = query.match(/update(\w+)\s*\(/i);
        if (updateMatch) {
          return 'update' + updateMatch[1];
        }
        
        const deleteMatch = query.match(/delete(\w+)\s*\(/i);
        if (deleteMatch) {
          return 'delete' + deleteMatch[1];
        }
      }
      
      return undefined;
    } catch (error: unknown) {
      logger.warn('Error extracting entity type from query', { 
        error: error instanceof Error ? error.message : String(error),
        query
      });
      return undefined;
    }
  }
  
  /**
   * Get the base entity type by removing any operation prefix
   * 
   * @param entityType Entity type with operation prefix
   * @returns Base entity type
   */
  private getBaseEntityType(entityType: string): string {
    return entityType.replace(/^(get|query|add|update|delete)/, '');
  }
  
  /**
   * Execute a GraphQL query against the local database
   * 
   * @param query GraphQL query string
   * @param variables Query variables
   * @param entityType Entity type with operation prefix
   * @param baseEntityType Base entity type without prefix
   * @returns Query result
   */
  private async executeQuery(
    query: string, 
    variables?: Record<string, any>, 
    entityType?: string,
    baseEntityType?: string
  ): Promise<any> {
    if (!entityType || !baseEntityType) {
      throw new Error('Entity type is required for queries');
    }
    
    // Get the store for this entity type
    const store = await getStore(baseEntityType);
    await store.read(); // Ensure we have the latest data
    
    // Access the collection
    const collection = store.data[baseEntityType] as EntityData;
    
    if (entityType.startsWith('get')) {
      // Handle getX query (by ID)
      if (!variables?.id) {
        return { [entityType.slice(3)]: null };
      }
      
      const item = collection[variables.id];
      return { [entityType.slice(3)]: item || null };
    } else if (entityType.startsWith('query')) {
      // Handle queryX query (filter-based)
      // Convert values to an array so we can filter them
      const items = Object.values(collection);
      
      // Filter items based on the provided filter
      let filteredItems = [...items];
      
      if (variables?.filter) {
        filteredItems = items.filter(item => {
          return Object.entries(variables.filter).every(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle operators like eq, contains, etc.
              const ops = value as Record<string, any>;
              
              if (ops.eq !== undefined) {
                return item[key] === ops.eq;
              } else if (ops.contains !== undefined) {
                return String(item[key]).toLowerCase().includes(String(ops.contains).toLowerCase());
              }
              // Add more operators as needed
              return false;
            } else {
              // Direct equality comparison
              return item[key] === value;
            }
          });
        });
      }
      
      // Apply limit if provided
      const limit = variables?.first || 100;
      const limitedItems = filteredItems.slice(0, limit);
      
      return { [entityType.slice(5)]: limitedItems || [] };
    }
    
    // Default to returning empty result
    return { [baseEntityType]: [] };
  }
  
  /**
   * Execute a GraphQL mutation against the local database
   * 
   * @param query GraphQL mutation string
   * @param variables Mutation variables
   * @param entityType Entity type with operation prefix
   * @param baseEntityType Base entity type without prefix
   * @returns Mutation result
   */
  private async executeMutation(
    query: string, 
    variables?: Record<string, any>, 
    entityType?: string,
    baseEntityType?: string
  ): Promise<any> {
    if (!entityType || !baseEntityType) {
      throw new Error('Entity type is required for mutations');
    }
    
    // Execute the appropriate operation based on the prefix
    if (entityType.startsWith('add')) {
      return await this.executeAddMutation(variables, baseEntityType);
    } else if (entityType.startsWith('update')) {
      return await this.executeUpdateMutation(variables, baseEntityType);
    } else if (entityType.startsWith('delete')) {
      return await this.executeDeleteMutation(variables, baseEntityType);
    } else {
      throw new Error(`Unsupported mutation operation for entity type ${entityType}`);
    }
  }
  
  /**
   * Execute an add mutation
   * 
   * @param variables Mutation variables
   * @param baseEntityType Base entity type
   * @returns Mutation result
   */
  private async executeAddMutation(
    variables?: Record<string, any>, 
    baseEntityType?: string
  ): Promise<any> {
    if (!variables?.input || !baseEntityType) {
      throw new Error('Input and entityType are required for add mutations');
    }
    
    // Get the store for this entity type
    const store = await getStore(baseEntityType);
    await store.read(); // Ensure we have the latest data
    
    // Access the collection
    const collection = store.data[baseEntityType] as EntityData;
    
    // Process input (handle array or single object)
    let input = Array.isArray(variables.input) ? variables.input[0] : variables.input;
    
    // Add generated fields
    input = {
      ...input,
      id: input.id || `${baseEntityType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: input.createdAt || new Date().toISOString(),
    };
    
    // Add to collection
    collection[input.id] = input;
    
    // Save changes
    await store.write();
    
    return {
      [`add${baseEntityType}`]: {
        [baseEntityType.toLowerCase()]: [input],
        numUids: 1
      }
    };
  }
  
  /**
   * Execute an update mutation
   * 
   * @param variables Mutation variables
   * @param baseEntityType Base entity type
   * @returns Mutation result
   */
  private async executeUpdateMutation(
    variables?: Record<string, any>, 
    baseEntityType?: string
  ): Promise<any> {
    if (!baseEntityType) {
      throw new Error('Entity type is required for update mutations');
    }
    
    // The input structure varies between updateX(input: ...) and updateX($id, $patch)
    let filter: Record<string, any> = {};
    let set: Record<string, any> = {};
    let remove: Record<string, any> = {};
    
    // Handle different input formats
    if (variables?.input) {
      // Format: updateX(input: { filter: {...}, set: {...}, remove: {...} })
      filter = variables.input.filter || {};
      set = variables.input.set || {};
      remove = variables.input.remove || {};
    } else if (variables?.id) {
      // Format: updateX($id, $patch)
      filter = { id: variables.id };
      set = variables.patch || {};
    } else {
      throw new Error('Invalid update format - missing filter or ID');
    }
    
    // Get the store for this entity type
    const store = await getStore(baseEntityType);
    await store.read(); // Ensure we have the latest data
    
    // Access the collection
    const collection = store.data[baseEntityType] as EntityData;
    
    // Find matching items
    let matchingIds: string[] = [];
    
    if (filter.id) {
      // Direct ID match
      if (Array.isArray(filter.id)) {
        matchingIds = filter.id.filter((id: string) => collection[id]);
      } else {
        if (collection[filter.id]) {
          matchingIds = [filter.id];
        }
      }
    } else {
      // Filter based on other properties
      matchingIds = Object.entries(collection)
        .filter(([_, item]) => {
          return Object.entries(filter).every(([key, value]) => item[key] === value);
        })
        .map(([id, _]) => id);
    }
    
    // Add updatedAt timestamp
    set.updatedAt = new Date().toISOString();
    
    // Handle special relationships - convert { field: { id: "xxx" } } to { field: "xxx" }
    // In a real implementation, this would be more complex and handle actual relationships
    for (const [key, value] of Object.entries(set)) {
      if (value && typeof value === 'object' && 'id' in value) {
        set[key] = value.id;
      }
    }
    
    // Update matched items
    for (const id of matchingIds) {
      // Apply updates
      collection[id] = {
        ...collection[id],
        ...set
      };
      
      // Remove fields if specified
      for (const key of Object.keys(remove)) {
        delete collection[id][key];
      }
    }
    
    // Save changes
    await store.write();
    
    // Get updated items
    const updatedItems = matchingIds.map(id => collection[id]);
    
    return {
      [`update${baseEntityType}`]: {
        [baseEntityType.toLowerCase()]: updatedItems,
        numUids: matchingIds.length
      }
    };
  }
  
  /**
   * Execute a delete mutation
   * 
   * @param variables Mutation variables
   * @param baseEntityType Base entity type
   * @returns Mutation result
   */
  private async executeDeleteMutation(
    variables?: Record<string, any>, 
    baseEntityType?: string
  ): Promise<any> {
    if (!variables?.filter || !baseEntityType) {
      throw new Error('Filter and entityType are required for delete mutations');
    }
    
    // Get the store for this entity type
    const store = await getStore(baseEntityType);
    await store.read(); // Ensure we have the latest data
    
    // Access the collection
    const collection = store.data[baseEntityType] as EntityData;
    
    const filter = variables.filter;
    
    // Find matching items
    let matchingIds: string[] = [];
    
    if (filter.id) {
      // Direct ID match
      if (Array.isArray(filter.id)) {
        matchingIds = filter.id.filter((id: string) => collection[id]);
      } else {
        if (collection[filter.id]) {
          matchingIds = [filter.id];
        }
      }
    } else {
      // Filter based on other properties
      matchingIds = Object.entries(collection)
        .filter(([_, item]) => {
          return Object.entries(filter).every(([key, value]) => item[key] === value);
        })
        .map(([id, _]) => id);
    }
    
    // Delete matched items
    for (const id of matchingIds) {
      delete collection[id];
    }
    
    // Save changes
    await store.write();
    
    return {
      [`delete${baseEntityType}`]: {
        msg: `Deleted ${matchingIds.length} ${baseEntityType.toLowerCase()} node(s)`,
        numUids: matchingIds.length
      }
    };
  }
}

/**
 * Initialize the schema in the local database
 * Creates necessary collections and loads schema
 * 
 * @param schemaPath Path to the GraphQL schema file
 * @returns Promise that resolves when schema is initialized
 */
export async function initLocalSchema(schemaPath: string): Promise<void> {
  try {
    // Ensure the DB directory exists
    await ensureDbDir();
    
    // Read schema file
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Extract type definitions
    const typeRegex = /type\s+(\w+)\s*{/g;
    let match;
    
    const types = [];
    while ((match = typeRegex.exec(schema)) !== null) {
      types.push(match[1]);
    }
    
    // Create a store for each type
    for (const type of types) {
      await getStore(type);
    }
    
    // Save schema to special schema store
    const schemaStore = await getStore('_Schema');
    await schemaStore.read();
    
    // Initialize Schema collection if it doesn't exist
    if (!schemaStore.data._Schema) {
      schemaStore.data._Schema = {};
    }
    
    // Store schema
    schemaStore.data._Schema = {
      'schema': {
        id: 'schema',
        content: schema,
        updatedAt: new Date().toISOString()
      }
    };
    
    await schemaStore.write();
    
    logger.info('Initialized local schema', { types });
  } catch (error: unknown) {
    logger.error('Failed to initialize local schema', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Local schema initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if the schema exists in the local database and if it needs an update
 * 
 * @param newSchemaPath Path to the new schema file
 * @returns Schema check result
 */
export async function checkLocalSchema(newSchemaPath: string): Promise<SchemaCheckResult> {
  try {
    // Ensure the DB directory exists
    await ensureDbDir();
    
    // Read new schema
    const newSchema = await fs.readFile(newSchemaPath, 'utf8');
    
    // Check if schema store exists
    const schemaStore = await getStore('_Schema');
    await schemaStore.read();
    
    // Get the current schema
    const schemaData = schemaStore.data._Schema as EntityData;
    const currentSchema = schemaData && schemaData['schema'] ? 
                        schemaData['schema'].content : null;
    
    if (!currentSchema) {
      return {
        exists: false,
        needsUpdate: true
      };
    }
    
    // Compare schemas (simple string comparison for now)
    const needsUpdate = currentSchema !== newSchema;
    
    return {
      exists: true,
      currentSchema,
      needsUpdate,
      differences: needsUpdate ? ['Schema content differs'] : undefined
    };
  } catch (error: unknown) {
    logger.error('Failed to check local schema', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Local schema check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Create singleton client instance
let localGraphClient: LocalGraphClient | null = null;

/**
 * Get a LocalGraphClient instance
 * 
 * @returns LocalGraphClient instance
 */
export function getLocalGraphClient(): LocalGraphClient {
  if (!localGraphClient) {
    localGraphClient = new LocalGraphClient();
  }
  
  return localGraphClient;
}

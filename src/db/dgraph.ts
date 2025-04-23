/**
 * GraphDatabase Implementation for Warp Agent System
 * Uses Dgraph as the primary database with LocalGraphDatabase as fallback
 */

import { DgraphClient } from './dgraph-client.js';
import { LocalGraphDatabase } from './local-graph.js';
import { join } from 'path';
import fs from 'fs';

export class GraphDatabase {
  // Make properties accessible to other modules
  localDb: LocalGraphDatabase | null = null;
  dgraphClient: DgraphClient | null = null;
  useFallback: boolean = false;
  private initialized: boolean = false;
  
  /**
   * Constructor
   * @param dgraphUrl Dgraph Alpha URL
   * @param localDbPath Path to local database
   */
  constructor(dgraphUrl: string, localDbPath: string) {
    this.initializeAsync(dgraphUrl, localDbPath).catch(error => {
      console.error('Error during initialization:', error);
      this.useFallback = true;
      this.initializeFallback(localDbPath);
    });
  }
  
  /**
   * Asynchronous initialization
   * @param dgraphUrl Dgraph Alpha URL
   * @param localDbPath Path to local database
   */
  private async initializeAsync(dgraphUrl: string, localDbPath: string): Promise<void> {
    try {
      const available = await this.checkDgraphAvailability(dgraphUrl);
      this.useFallback = !available;
      
      if (this.useFallback) {
        this.initializeFallback(localDbPath);
      } else {
        console.log('Using Dgraph for CKG');
        this.dgraphClient = new DgraphClient(dgraphUrl);
        this.initialized = true;
      }
    } catch (error) {
      console.error('Error during async initialization:', error);
      this.useFallback = true;
      this.initializeFallback(localDbPath);
    }
  }
  
  /**
   * Initialize fallback database
   * @param localDbPath Path to local database
   */
  private initializeFallback(localDbPath: string): void {
    console.log('Dgraph not available, using local fallback database');
    this.localDb = new LocalGraphDatabase(localDbPath);
    this.localDb.initialize().then(() => {
      this.initialized = true;
    }).catch(error => {
      console.error('Failed to initialize local database:', error);
    });
  }
  
  /**
   * Check if Dgraph is available
   * @param url Dgraph Alpha URL
   * @returns Promise<boolean> True if Dgraph is available
   */
  private async checkDgraphAvailability(url: string): Promise<boolean> {
    try {
      const client = new DgraphClient(url);
      const available = await client.isAvailable();
      
      if (!available) {
        client.close();
      }
      
      return available;
    } catch (error) {
      console.warn('Error checking Dgraph availability:', error);
      return false;
    }
  }
  
  /**
   * Wait for initialization to complete
   * @param timeoutMs Timeout in milliseconds
   * @returns Promise<boolean> True if initialization completed
   */
  private async waitForInitialization(timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Initialization timed out');
      }
    }
    
    return true;
  }
  
  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    await this.waitForInitialization();
  }
  
  /**
   * Apply GraphQL schema to the database
   * @param schema GraphQL schema string
   * @returns Promise<boolean> True if successful
   */
  async applySchema(schema: string): Promise<boolean> {
    await this.waitForInitialization();
    
    if (this.useFallback && this.localDb) {
      return this.localDb.applySchema(schema);
    } else if (this.dgraphClient) {
      return this.dgraphClient.applySchema(schema);
    } else {
      throw new Error('No database connection available');
    }
  }
  
  /**
   * Execute a GraphQL query
   * @param query GraphQL query string
   * @param variables Query variables
   * @returns Promise<any> Query result
   */
  async executeQuery(query: string, variables: any = {}): Promise<any> {
    await this.waitForInitialization();
    
    if (this.useFallback && this.localDb) {
      return this.localDb.executeGraphQL(query, variables);
    } else if (this.dgraphClient) {
      return this.dgraphClient.query(query, variables);
    } else {
      throw new Error('No database connection available');
    }
  }
  
  /**
   * Execute a GraphQL mutation
   * @param mutation GraphQL mutation string
   * @param variables Mutation variables
   * @returns Promise<any> Mutation result
   */
  async executeMutation(mutation: any, variables: any = {}): Promise<any> {
    await this.waitForInitialization();
    
    if (this.useFallback && this.localDb) {
      return this.localDb.executeGraphQL(mutation, variables);
    } else if (this.dgraphClient) {
      // Handle object mutation format
      if (typeof mutation === 'object') {
        return this.dgraphClient.mutate(mutation);
      }
      
      // Convert GraphQL mutation to Dgraph mutation
      // This is a simplified implementation - a real implementation would
      // parse the GraphQL mutation and convert it to Dgraph format
      
      // Extract operation type (add, update, delete)
      const operation = mutation.match(/(add|update|delete)([A-Z][a-zA-Z]*)/i)?.[1]?.toLowerCase();
      const entityType = mutation.match(/(add|update|delete)([A-Z][a-zA-Z]*)/i)?.[2];
      
      if (!operation || !entityType) {
        throw new Error(`Failed to parse mutation: ${mutation}`);
      }
      
      // Extract input data from variables
      const inputData = variables.input || variables[`${entityType.toLowerCase()}Input`] || variables;
      
      switch (operation) {
        case 'add':
          return { [entityType.toLowerCase()]: { id: await this.dgraphClient.createNode(entityType, inputData) } };
        
        case 'update':
          if (!inputData.id) {
            throw new Error('Update mutation requires an id field');
          }
          
          const success = await this.dgraphClient.updateNode(inputData.id, entityType, inputData);
          return { [entityType.toLowerCase()]: { id: inputData.id } };
        
        case 'delete':
          // Implement delete operation
          throw new Error('Delete operation not implemented');
        
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } else {
      throw new Error('No database connection available');
    }
  }
  
  /**
   * Create a relationship between entities
   * @param fromType Source entity type
   * @param fromId Source entity ID
   * @param relationType Relationship type
   * @param toType Target entity type
   * @param toId Target entity ID
   */
  async createRelationship(
    fromType: string, 
    fromId: string, 
    relationType: string, 
    toType: string, 
    toId: string
  ): Promise<any> {
    await this.waitForInitialization();
    
    if (this.useFallback && this.localDb) {
      return this.localDb.createRelationship(fromType, fromId, relationType, toType, toId);
    } else if (this.dgraphClient) {
      return this.dgraphClient.createRelationship(fromId, fromType, toId, toType, relationType);
    } else {
      throw new Error('No database connection available');
    }
  }
  
  /**
   * Get related entities
   * @param entityType Entity type
   * @param entityId Entity ID
   * @param relationType Relationship type (optional)
   */
  async getRelatedEntities(
    entityType: string, 
    entityId: string, 
    relationType?: string
  ): Promise<any[]> {
    await this.waitForInitialization();
    
    if (this.useFallback && this.localDb) {
      return this.localDb.getRelatedEntities(entityType, entityId, relationType);
    } else if (this.dgraphClient) {
      return this.dgraphClient.getRelatedEntities(entityId, entityType, relationType);
    } else {
      throw new Error('No database connection available');
    }
  }
  
  /**
   * Keyword search across nodes
   * @param types Array of node types to search
   * @param keyword Keyword to search for
   * @param limit Maximum number of results
   * @returns Promise<any[]> Search results
   */
  async keywordSearch(types: string[], keyword: string, limit: number = 10): Promise<any[]> {
    await this.waitForInitialization();
    
    if (this.useFallback && this.localDb) {
      console.warn('Keyword search not fully implemented in local database');
      return [];
    } else if (this.dgraphClient) {
      return this.dgraphClient.keywordSearch(types, keyword, limit);
    } else {
      throw new Error('No database connection available');
    }
  }
  
  /**
   * Vector search (if supported)
   * @param vector Vector to search for
   * @param field Vector field to search
   * @param limit Maximum number of results
   * @returns Promise<any[]> Search results
   */
  async vectorSearch(vector: number[], field: string, limit: number = 10): Promise<any[]> {
    await this.waitForInitialization();
    
    if (this.useFallback && this.localDb) {
      throw new Error('Vector search not supported in local database');
    } else if (this.dgraphClient) {
      try {
        return await this.dgraphClient.vectorSearch(vector, field, limit);
      } catch (error) {
        console.error('Vector search error:', error);
        throw new Error('Vector search failed or not configured');
      }
    } else {
      throw new Error('No database connection available');
    }
  }
  
  /**
   * Ensure storage directory exists
   * @param path Directory path
   */
  async ensureStorageDirectoryExists(path: string): Promise<void> {
    if (this.useFallback) {
      try {
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path, { recursive: true });
          console.log(`Created storage directory: ${path}`);
        }
      } catch (error) {
        console.error(`Failed to create storage directory: ${path}`, error);
        throw new Error(`Failed to create storage directory: ${error.message}`);
      }
    }
  }
  
  /**
   * Close database connections
   */
  close(): void {
    if (this.dgraphClient) {
      this.dgraphClient.close();
    }
  }
}

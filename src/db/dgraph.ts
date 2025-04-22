// src/db/dgraph.ts
import { DgraphClient, DgraphClientStub, Operation } from 'dgraph-js';
import { credentials } from '@grpc/grpc-js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { GraphQLClient } from 'graphql-request';
import { promises as fsPromises } from 'fs';
import { 
  getLocalGraphClient, 
  initLocalSchema, 
  checkLocalSchema 
} from './local-graph.js';

// Track connection status
let isDgraphAvailable = false;

/**
 * Check if Dgraph is available
 * 
 * @returns Promise that resolves to true if Dgraph is available, false otherwise
 */
export async function isDgraphRunning(): Promise<boolean> {
  try {
    const client = await createDgraphClientWithFallback(false);
    if (client instanceof DgraphClient) {
      isDgraphAvailable = true;
      return true;
    } else {
      isDgraphAvailable = false;
      return false;
    }
  } catch (error: unknown) {
    logger.warn('Dgraph is not available', { 
      error: error instanceof Error ? error.message : String(error)
    });
    isDgraphAvailable = false;
    return false;
  }
}

/**
 * Create a Dgraph client, falling back to the local implementation if Dgraph is not available
 * 
 * @param allowFallback Whether to allow fallback to local implementation
 * @returns DgraphClient instance or a local client
 */
export async function createDgraphClientWithFallback(allowFallback = true): Promise<DgraphClient | any> {
  try {
    const serverAddress = config.dgraph.address;
    logger.debug('Creating Dgraph client', { serverAddress });
    
    // Create a client stub
    const clientStub = new DgraphClientStub(
      serverAddress,
      credentials.createInsecure()
    );
    
    // Check if Dgraph is available by making a simple query
    try {
      const dgraphClient = new DgraphClient(clientStub);
      const txn = dgraphClient.newTxn({ readOnly: true });
      
      try {
        await txn.query('schema {}');
        isDgraphAvailable = true;
        logger.info('Connected to Dgraph successfully');
        return dgraphClient;
      } catch (queryError: unknown) {
        clientStub.close();
        throw new Error(`Failed to query Dgraph: ${queryError instanceof Error ? queryError.message : String(queryError)}`);
      } finally {
        await txn.discard();
      }
    } catch (error: unknown) {
      clientStub.close();
      throw new Error(`Failed to connect to Dgraph: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error: unknown) {
    logger.warn('Failed to create Dgraph client', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    if (allowFallback) {
      logger.info('Falling back to local implementation');
      return getLocalGraphClient();
    } else {
      throw error;
    }
  }
}

/**
 * Create a Dgraph client
 * 
 * @param address Dgraph server address (defaults to config)
 * @returns DgraphClient instance
 */
export function createDgraphClient(address?: string): DgraphClient {
  try {
    const serverAddress = address || config.dgraph.address;
    logger.debug('Creating Dgraph client', { serverAddress });
    
    // Create a client stub
    const clientStub = new DgraphClientStub(
      serverAddress,
      credentials.createInsecure()
    );
    
    // Create and return the client
    return new DgraphClient(clientStub);
  } catch (error: unknown) {
    logger.error('Failed to create Dgraph client', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Failed to create Dgraph client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a GraphQL client for Dgraph, falling back to the local implementation if Dgraph is not available
 * 
 * @param allowFallback Whether to allow fallback to local implementation
 * @returns GraphQL client instance
 */
export async function createGraphQLClientWithFallback(allowFallback = true): Promise<GraphQLClient | any> {
  try {
    logger.debug('Creating GraphQL client', { endpoint: config.dgraph.graphqlEndpoint });
    
    // Check if Dgraph is available
    if (!isDgraphAvailable) {
      await isDgraphRunning();
    }
    
    if (isDgraphAvailable) {
      // Create headers
      const headers: Record<string, string> = {};
      if (config.dgraph.authToken) {
        headers['Authorization'] = `Bearer ${config.dgraph.authToken}`;
      }
      
      // Create and return the client
      return new GraphQLClient(config.dgraph.graphqlEndpoint, { headers });
    } else if (allowFallback) {
      logger.info('Falling back to local implementation for GraphQL client');
      return getLocalGraphClient();
    } else {
      throw new Error('Dgraph is not available and fallback is not allowed');
    }
  } catch (error: unknown) {
    logger.error('Failed to create GraphQL client', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    if (allowFallback) {
      logger.info('Falling back to local implementation for GraphQL client');
      return getLocalGraphClient();
    } else {
      throw new Error(`Failed to create GraphQL client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Create a GraphQL client for Dgraph
 * 
 * @returns GraphQL client instance
 */
export function createGraphQLClient(): GraphQLClient {
  try {
    logger.debug('Creating GraphQL client', { endpoint: config.dgraph.graphqlEndpoint });
    
    // Create headers
    const headers: Record<string, string> = {};
    if (config.dgraph.authToken) {
      headers['Authorization'] = `Bearer ${config.dgraph.authToken}`;
    }
    
    // Create and return the client
    return new GraphQLClient(config.dgraph.graphqlEndpoint, { headers });
  } catch (error: unknown) {
    logger.error('Failed to create GraphQL client', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Failed to create GraphQL client: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Initialize the schema
 * 
 * @param schemaPath Path to the GraphQL schema file
 * @param allowFallback Whether to allow fallback to local implementation
 * @returns Promise that resolves when schema is initialized
 */
export async function initSchema(schemaPath: string, allowFallback = true): Promise<void> {
  try {
    // Check if Dgraph is available
    if (!isDgraphAvailable) {
      await isDgraphRunning();
    }
    
    if (isDgraphAvailable) {
      // Initialize schema in Dgraph
      const client = createDgraphClient();
      await importSchema(client, schemaPath);
      logger.info('Schema initialized in Dgraph');
    } else if (allowFallback) {
      // Initialize schema in local implementation
      await initLocalSchema(schemaPath);
      logger.info('Schema initialized in local implementation');
    } else {
      throw new Error('Dgraph is not available and fallback is not allowed');
    }
  } catch (error: unknown) {
    logger.error('Failed to initialize schema', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    if (allowFallback) {
      try {
        // Initialize schema in local implementation
        await initLocalSchema(schemaPath);
        logger.info('Schema initialized in local implementation after Dgraph failure');
      } catch (fallbackError: unknown) {
        logger.error('Failed to initialize schema in local implementation', { 
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) 
        });
        throw new Error(`Schema initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      throw new Error(`Schema initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Import a schema into Dgraph
 * 
 * @param client Dgraph client
 * @param schemaPath Path to the GraphQL schema file
 * @returns Promise that resolves when schema is imported
 */
async function importSchema(client: DgraphClient, schemaPath: string): Promise<void> {
  try {
    // Read the schema file
    const schema = await fsPromises.readFile(schemaPath, 'utf8');
    
    // Create a new operation
    const op = new Operation();
    
    // Set the schema
    op.setSchema(schema);
    
    // Run the operation
    await client.alter(op);
    
    logger.info('Schema imported successfully');
  } catch (error: unknown) {
    logger.error('Failed to import schema', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Failed to import schema: ${error instanceof Error ? error.message : String(error)}`);
  }
}

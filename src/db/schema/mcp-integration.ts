// src/db/schema/mcp-integration.ts
import { DgraphClient } from 'dgraph-js';
import { createDgraphClient } from '../dgraph';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { initSchemaAndGenerateZod } from './init-wrapper';
import { checkSchema } from './schema-utils';
import fs from 'fs';
import path from 'path';

/**
 * Initialize the schema during MCP server startup
 * 
 * @param options Configuration options for initialization
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeCkgSchema(
  options: {
    autoInit?: boolean;
    schemaPath?: string;
    dgraphAddress?: string;
    dropAll?: boolean;
  } = {}
): Promise<boolean> {
  try {
    const schemaPath = options.schemaPath || path.join(__dirname, 'schema.graphql');
    const dgraphAddress = options.dgraphAddress || config.dgraph.address;
    
    // Check if the schema file exists
    if (!fs.existsSync(schemaPath)) {
      logger.error('Schema file not found during MCP server startup', { schemaPath });
      return false;
    }
    
    // Create Dgraph client
    const client = createDgraphClient(dgraphAddress);
    
    // Check schema status
    const status = await checkSchema(client, schemaPath);
    
    if (options.autoInit) {
      // Auto-initialization is enabled
      if (!status.exists || status.needsUpdate) {
        logger.info(
          status.exists 
            ? 'Schema needs updating, initializing...' 
            : 'Schema does not exist, initializing...',
          { differences: status.differences }
        );
        
        await initSchemaAndGenerateZod({
          schemaPath,
          dgraphAddress,
          dropAll: options.dropAll || false,
          generateZod: true,
          zodOutputPath: path.join(__dirname, '..', '..', 'types', 'generated', 'ckg-schema.ts')
        });
        
        logger.info('Schema initialized and Zod schemas generated automatically during MCP server startup');
        return true;
      } else {
        logger.info('Schema is up to date, no initialization needed');
        return true;
      }
    } else {
      // Auto-initialization is disabled
      if (!status.exists) {
        logger.warn('Schema does not exist in the database but auto-init is disabled');
        return false;
      } else if (status.needsUpdate) {
        logger.warn('Schema needs update but auto-init is disabled', {
          differences: status.differences
        });
        return false;
      } else {
        logger.info('Schema is up to date');
        return true;
      }
    }
  } catch (error) {
    logger.error('Failed to initialize schema during MCP server startup', { error });
    return false;
  }
}

/**
 * Register MCP server schema management event handlers
 * 
 * @param server MCP server instance
 */
export function registerSchemaEvents(server: any): void {
  // Listen for server startup event
  server.on('startup', async () => {
    const result = await initializeCkgSchema({
      autoInit: config.ckg.autoInitSchema,
      schemaPath: config.ckg.schemaPath,
      dgraphAddress: config.dgraph.address,
      dropAll: false
    });
    
    if (!result) {
      logger.warn('CKG schema may not be properly initialized. Run npm run schema:init to resolve.');
    }
  });
  
  // Register schema management endpoint (optional)
  server.registerEndpoint('/admin/schema/check', async (req: any, res: any) => {
    try {
      const client = createDgraphClient(config.dgraph.address);
      const status = await checkSchema(client, config.ckg.schemaPath);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  server.registerEndpoint('/admin/schema/init', async (req: any, res: any) => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
      const { dropAll = false } = req.body || {};
      
      await initSchemaAndGenerateZod({
        schemaPath: config.ckg.schemaPath,
        dgraphAddress: config.dgraph.address,
        dropAll
      });
      
      res.json({ success: true, message: 'Schema initialized successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

/**
 * Add this to MCP server index.ts:
 * 
 * import { registerSchemaEvents } from './db/schema/mcp-integration';
 * // Initialize MCP server
 * const server = new MCPServer({
 *   name: 'warp-mcp-server',
 *   version: '0.1.0',
 *   description: 'MCP server for Warp Agent System',
 * });
 * 
 * // Register schema management events
 * registerSchemaEvents(server);
 * 
 * // Register tools
 * // ...
 */
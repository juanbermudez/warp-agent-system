// src/index.ts
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { queryCkgTool } from './tools/query_ckg.js';
import { updateCkgTool } from './tools/update_ckg.js';
import { initializeSchemaHandler } from './tools/initialize_schema.js';
import { isDgraphRunning, initSchema } from './db/dgraph.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the database
 * 
 * @returns Promise that resolves when initialization is complete
 */
async function initializeDatabase(): Promise<boolean> {
  try {
    logger.info('Checking Dgraph availability...');
    
    // Check if Dgraph is running
    const dgraphAvailable = await isDgraphRunning();
    
    if (dgraphAvailable) {
      logger.info('Dgraph is available');
    } else {
      logger.warn('Dgraph is not available, will use local fallback');
    }
    
    // Initialize schema
    const schemaPath = path.join(__dirname, 'db', 'schema', 'schema.graphql');
    await initSchema(schemaPath, true);
    
    return true;
  } catch (error: unknown) {
    logger.error('Failed to initialize database', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
}

/**
 * Application main function
 */
async function main() {
  try {
    logger.info('Warp Agent System initializing...');
    logger.info('Configuration loaded', { 
      dgraphAddress: config.dgraph.address,
      mcpPort: config.mcp.port
    });

    // Initialize database
    await initializeDatabase();

    // Log available tools
    const tools = [
      queryCkgTool,
      updateCkgTool,
      initializeSchemaHandler,
      // Additional tools would be listed here as they are implemented
    ];

    logger.info('Available tools:', { tools: tools.map(tool => tool.name) });

    // In the future, this would initialize the actual MCP server
    // For now, just log a message
    logger.info('Warp Agent System is ready. Use npm scripts to manage the system:');
    logger.info(' - npm run schema:init       # Initialize the Dgraph schema');
    logger.info(' - npm run schema:check      # Check the schema status');
    logger.info(' - npm run schema:generate-zod # Generate Zod schemas from GraphQL');
    
    // Keep the process running
    logger.info('Press Ctrl+C to exit');
  } catch (error: unknown) {
    logger.error('Error initializing Warp Agent System', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  logger.error('Unhandled error in main function', { 
    error: error instanceof Error ? error.message : String(error) 
  });
  process.exit(1);
});

// src/db/schema/init-schema.ts
import { logger } from '../../utils/logger';
import { config } from '../../config';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { SchemaInitOptions, schemaInitOptionsSchema } from './schema-types';
import { 
  createDgraphClientWithFallback, 
  initSchema as initDbSchema,
  isDgraphRunning 
} from '../dgraph';

/**
 * Initialize the Dgraph schema with the GraphQL schema definition
 * 
 * @param options Schema initialization options
 * @returns Promise that resolves when schema is initialized
 */
export async function initSchema(options?: Partial<SchemaInitOptions>): Promise<void> {
  try {
    // Validate options using Zod
    const validatedOptions = schemaInitOptionsSchema.parse({
      schemaPath: options?.schemaPath || path.join(__dirname, 'schema.graphql'),
      dgraphAddress: options?.dgraphAddress || config.dgraph.address,
      dropAll: options?.dropAll || false,
      logLevel: options?.logLevel || 'info',
      ...options
    });

    // Set log level for this operation
    const originalLogLevel = logger.level;
    logger.level = validatedOptions.logLevel;

    logger.info('Initializing Dgraph schema', { 
      schemaPath: validatedOptions.schemaPath,
      dgraphAddress: validatedOptions.dgraphAddress,
      dropAll: validatedOptions.dropAll
    });

    // Read the GraphQL schema file
    if (!fs.existsSync(validatedOptions.schemaPath)) {
      throw new Error(`Schema file not found: ${validatedOptions.schemaPath}`);
    }

    // Check if Dgraph is running
    const dgraphAvailable = await isDgraphRunning();
    logger.info(`Dgraph availability: ${dgraphAvailable ? 'available' : 'not available'}`);

    // Initialize schema
    await initDbSchema(validatedOptions.schemaPath, true);

    logger.info('Schema initialized successfully');

    // Restore original log level
    logger.level = originalLogLevel;
  } catch (error: unknown) {
    logger.error('Failed to initialize schema', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Schema initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// src/db/schema/init-wrapper.ts
import { initSchema } from './init-schema';
import { generateZodSchemasFromGraphQL } from './generate-zod-schemas';
import { logger } from '../../utils/logger';
import { SchemaInitOptions } from './schema-types';
import path from 'path';

/**
 * Initialize the Dgraph schema and generate Zod schemas
 * 
 * @param options Schema initialization options
 * @returns Promise that resolves when initialization and generation are complete
 */
export async function initSchemaAndGenerateZod(
  options?: Partial<SchemaInitOptions> & { generateZod?: boolean, zodOutputPath?: string }
): Promise<void> {
  try {
    // Default options
    const generateZod = options?.generateZod ?? true;
    const zodOutputPath = options?.zodOutputPath ?? path.join(
      __dirname, '..', '..', 'types', 'generated', 'ckg-schema.ts'
    );
    
    logger.info('Initializing schema and generating Zod schemas', {
      schemaPath: options?.schemaPath,
      zodOutputPath,
      generateZod
    });
    
    // First initialize the schema in Dgraph
    await initSchema(options);
    
    // Then generate Zod schemas if enabled
    if (generateZod) {
      await generateZodSchemasFromGraphQL(
        options?.schemaPath || path.join(__dirname, 'schema.graphql'),
        zodOutputPath
      );
    }
    
    logger.info('Schema initialization and generation completed successfully');
  } catch (error: unknown) {
    logger.error('Failed to initialize schema and generate Zod schemas', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Schema initialization and generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update only the Zod schemas without modifying Dgraph
 * 
 * @param schemaPath Path to the GraphQL schema file
 * @param outputPath Path to write the generated Zod schemas
 * @returns Promise that resolves when generation is complete
 */
export async function updateZodSchemasOnly(
  schemaPath: string,
  outputPath?: string
): Promise<void> {
  try {
    const zodOutputPath = outputPath || path.join(
      __dirname, '..', '..', 'types', 'generated', 'ckg-schema.ts'
    );
    
    logger.info('Updating Zod schemas only', {
      schemaPath,
      zodOutputPath
    });
    
    await generateZodSchemasFromGraphQL(schemaPath, zodOutputPath);
    
    logger.info('Zod schemas updated successfully');
  } catch (error: unknown) {
    logger.error('Failed to update Zod schemas', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Zod schema update failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
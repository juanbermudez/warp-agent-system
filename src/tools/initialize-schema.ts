// src/tools/initialize_schema.ts
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { execSync } from 'child_process';

// Input schema
const initializeSchemaInputSchema = z.object({
  generateZod: z.boolean().default(true)
    .describe('Whether to generate Zod schemas from the GraphQL schema'),
});

// Output schema
const initializeSchemaOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  message: z.string(),
  error: z.string().optional(),
  logs: z.array(z.string()).optional(),
});

// Type definitions from schema
type InitializeSchemaInput = z.infer<typeof initializeSchemaInputSchema>;
type InitializeSchemaOutput = z.infer<typeof initializeSchemaOutputSchema>;

/**
 * Initialize the Dgraph schema using CLI tools
 * 
 * @param input Initialization parameters
 * @returns Initialization result
 */
export async function initializeSchema(input: InitializeSchemaInput): Promise<InitializeSchemaOutput> {
  try {
    // Validate input using schema
    const validatedInput = initializeSchemaInputSchema.parse(input);
    
    logger.info('Initializing schema', { generateZod: validatedInput.generateZod });
    
    // Determine which script to run based on input
    const scriptName = validatedInput.generateZod ? 'schema:init' : 'schema:init-no-zod';
    
    // Execute the appropriate npm script
    const logs = [];
    logs.push(`Running npm script: ${scriptName}`);
    
    try {
      const output = execSync(`npm run ${scriptName}`, { encoding: 'utf8' });
      logs.push(output);
    } catch (execError: unknown) {
      logger.error('Error executing schema initialization script', { 
        error: execError instanceof Error ? execError.message : String(execError) 
      });
      return {
        status: 'error',
        message: 'Failed to initialize schema',
        error: execError instanceof Error ? execError.message : String(execError),
        logs,
      };
    }
    
    // If generateZod is true, check if Zod schemas were generated successfully
    if (validatedInput.generateZod) {
      logs.push('Verifying Zod schema generation...');
      
      try {
        const syncOutput = execSync('npm run schema:check-sync', { encoding: 'utf8' });
        logs.push(syncOutput);
      } catch (syncError: unknown) {
        logger.warn('Schema sync check failed', { 
          error: syncError instanceof Error ? syncError.message : String(syncError) 
        });
        logs.push(`Warning: Schema sync check failed: ${syncError instanceof Error ? syncError.message : String(syncError)}`);
        // We don't return an error here since the initialization might still have succeeded
      }
    }
    
    return {
      status: 'success',
      message: 'Schema initialized successfully',
      logs,
    };
  } catch (error: unknown) {
    logger.error('Error in schema initialization', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return {
      status: 'error',
      message: 'Failed to initialize schema',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// MCP tool handler
export const initializeSchemaHandler = {
  name: 'initialize-schema',
  description: 'Initialize the Dgraph schema with optional Zod schema generation',
  parameters: initializeSchemaInputSchema,
  handler: initializeSchema,
};

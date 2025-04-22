// src/db/schema/schema-validator.ts
import { buildSchema, GraphQLSchema, parse, validate } from 'graphql';
import { logger } from '../../utils/logger';
import { SchemaValidationResult } from './schema-types';

/**
 * Validate a GraphQL schema string
 * 
 * @param schemaString GraphQL schema as a string
 * @returns Validation result with errors if any
 */
export function validateGraphQLSchema(schemaString: string): SchemaValidationResult {
  try {
    // First check if the schema can be parsed
    try {
      parse(schemaString);
    } catch (error: unknown) {
      logger.error('Failed to parse GraphQL schema', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return {
        valid: false,
        errors: [`Parse error: ${error instanceof Error ? error.message : String(error)}`]
      };
    }

    // Then build the schema and validate it
    let graphqlSchema: GraphQLSchema;
    try {
      graphqlSchema = buildSchema(schemaString);
    } catch (error: unknown) {
      logger.error('Failed to build GraphQL schema', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return {
        valid: false,
        errors: [`Build error: ${error instanceof Error ? error.message : String(error)}`]
      };
    }

    // If we get here, the schema is syntactically valid
    // For GraphQL, basic parsing and schema building are sufficient validation
    // since validate() is for validating queries against a schema, not the schema itself

    // Schema is valid
    logger.info('GraphQL schema validated successfully');
    return { valid: true };
  } catch (error: unknown) {
    logger.error('Unexpected error during schema validation', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return {
      valid: false,
      errors: [`Unexpected validation error: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Check if a schema contains appropriate Dgraph directives
 * 
 * @param schemaString GraphQL schema as a string
 * @returns Validation result with errors if any
 */
export function validateDgraphDirectives(schemaString: string): SchemaValidationResult {
  try {
    const requiredDirectives = ['@search', '@hasInverse'];
    const missingDirectives = [];
    
    for (const directive of requiredDirectives) {
      if (!schemaString.includes(directive)) {
        missingDirectives.push(directive);
      }
    }
    
    if (missingDirectives.length > 0) {
      logger.warn('Schema is missing Dgraph directives', { missingDirectives });
      return {
        valid: false,
        errors: [`Schema is missing required Dgraph directives: ${missingDirectives.join(', ')}`]
      };
    }
    
    return { valid: true };
  } catch (error: unknown) {
    logger.error('Error validating Dgraph directives', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return {
      valid: false,
      errors: [`Directive validation error: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

/**
 * Comprehensive schema validation that checks both GraphQL validity and Dgraph requirements
 * 
 * @param schemaString GraphQL schema as a string
 * @returns Validation result with errors if any
 */
export function validateSchema(schemaString: string): SchemaValidationResult {
  // First validate the general GraphQL schema
  const graphqlValidation = validateGraphQLSchema(schemaString);
  if (!graphqlValidation.valid) {
    return graphqlValidation;
  }
  
  // Then validate Dgraph-specific requirements
  const dgraphValidation = validateDgraphDirectives(schemaString);
  if (!dgraphValidation.valid) {
    return dgraphValidation;
  }
  
  // All checks passed
  return { valid: true };
}
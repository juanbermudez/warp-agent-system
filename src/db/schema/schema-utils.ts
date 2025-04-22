// src/db/schema/schema-utils.ts
import { buildSchema, printSchema, GraphQLSchema } from 'graphql';
import { DgraphClient } from 'dgraph-js';
import { createDgraphClient } from '../dgraph';
import { logger } from '../../utils/logger';
import { SchemaCheckResult, SchemaObject } from './schema-types';
import { validateSchema } from './schema-validator';
import fs from 'fs';
import path from 'path';

/**
 * Get the current schema from Dgraph
 * 
 * @param client Dgraph client
 * @returns Current schema as string or null if it doesn't exist
 */
export async function getCurrentSchema(client: DgraphClient): Promise<string | null> {
  try {
    // Query for schema using Dgraph's schema endpoint
    const txn = client.newTxn({ readOnly: true });
    try {
      const res = await txn.query(`schema {}`);
      return res.getJson().schema ? JSON.stringify(res.getJson().schema) : null;
    } finally {
      await txn.discard();
    }
  } catch (error: unknown) {
    logger.error('Failed to get current schema from Dgraph', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Check if the schema exists in Dgraph and if it needs an update
 * 
 * @param client Dgraph client
 * @param newSchemaPath Path to the new schema file
 * @returns Schema check result
 */
export async function checkSchema(
  client: DgraphClient,
  newSchemaPath: string
): Promise<SchemaCheckResult> {
  try {
    // Read the new schema
    const newSchema = await fs.promises.readFile(newSchemaPath, 'utf8');
    
    // Validate the new schema
    const validation = validateSchema(newSchema);
    if (!validation.valid) {
      throw new Error(`Invalid schema: ${validation.errors?.join(', ')}`);
    }
    
    // Get the current schema from Dgraph
    const currentSchema = await getCurrentSchema(client);
    
    // If no schema exists, we need to create it
    if (!currentSchema) {
      return {
        exists: false,
        needsUpdate: true
      };
    }
    
    // Parse both schemas to compare them
    const diffs = compareSchemas(currentSchema, newSchema);
    
    return {
      exists: true,
      currentSchema,
      needsUpdate: diffs.length > 0,
      differences: diffs.length > 0 ? diffs : undefined
    };
  } catch (error: unknown) {
    logger.error('Failed to check schema', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Schema check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Compare two schema strings and return differences
 * 
 * @param currentSchema Current schema as a string
 * @param newSchema New schema as a string
 * @returns Array of difference strings
 */
export function compareSchemas(currentSchema: string, newSchema: string): string[] {
  try {
    // Parse both schemas
    const current = parseSchema(currentSchema);
    const updated = parseSchema(newSchema);
    
    const differences: string[] = [];
    
    // Compare types
    const currentTypeMap = new Map(current.types.map(t => [t.name, t]));
    const updatedTypeMap = new Map(updated.types.map(t => [t.name, t]));
    
    // Check for new or removed types
    for (const [name, type] of updatedTypeMap.entries()) {
      if (!currentTypeMap.has(name)) {
        differences.push(`New type: ${name}`);
      } else {
        // Compare fields
        const currentType = currentTypeMap.get(name)!;
        const currentFieldMap = new Map(currentType.fields.map(f => [f.name, f]));
        const updatedFieldMap = new Map(type.fields.map(f => [f.name, f]));
        
        for (const [fieldName, field] of updatedFieldMap.entries()) {
          if (!currentFieldMap.has(fieldName)) {
            differences.push(`New field: ${name}.${fieldName}: ${field.type}`);
          } else {
            const currentField = currentFieldMap.get(fieldName)!;
            if (
              currentField.type !== field.type ||
              currentField.list !== field.list ||
              currentField.nonNull !== field.nonNull
            ) {
              differences.push(
                `Changed field: ${name}.${fieldName} from ${formatFieldType(currentField)} to ${formatFieldType(field)}`
              );
            }
            
            // Check for directive changes
            if (JSON.stringify(currentField.directives) !== JSON.stringify(field.directives)) {
              differences.push(`Changed directives on ${name}.${fieldName}`);
            }
          }
        }
        
        // Check for removed fields
        for (const fieldName of currentFieldMap.keys()) {
          if (!updatedFieldMap.has(fieldName)) {
            differences.push(`Removed field: ${name}.${fieldName}`);
          }
        }
      }
    }
    
    // Check for removed types
    for (const name of currentTypeMap.keys()) {
      if (!updatedTypeMap.has(name)) {
        differences.push(`Removed type: ${name}`);
      }
    }
    
    // Compare enums
    const currentEnumMap = new Map(current.enums.map(e => [e.name, e]));
    const updatedEnumMap = new Map(updated.enums.map(e => [e.name, e]));
    
    // Check for new or changed enums
    for (const [name, enumType] of updatedEnumMap.entries()) {
      if (!currentEnumMap.has(name)) {
        differences.push(`New enum: ${name}`);
      } else {
        const currentEnum = currentEnumMap.get(name)!;
        const currentValues = new Set(currentEnum.values);
        const updatedValues = new Set(enumType.values);
        
        // New values
        for (const value of updatedValues) {
          if (!currentValues.has(value)) {
            differences.push(`New enum value: ${name}.${value}`);
          }
        }
        
        // Removed values
        for (const value of currentValues) {
          if (!updatedValues.has(value)) {
            differences.push(`Removed enum value: ${name}.${value}`);
          }
        }
      }
    }
    
    // Check for removed enums
    for (const name of currentEnumMap.keys()) {
      if (!updatedEnumMap.has(name)) {
        differences.push(`Removed enum: ${name}`);
      }
    }
    
    return differences;
  } catch (error: unknown) {
    logger.error('Failed to compare schemas', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [`Error comparing schemas: ${error instanceof Error ? error.message : String(error)}`];
  }
}

/**
 * Parse a schema string into a SchemaObject
 * 
 * @param schemaString Schema as a string
 * @returns Parsed schema object
 */
function parseSchema(schemaString: string): SchemaObject {
  try {
    const schema = buildSchema(schemaString);
    const typeMap = schema.getTypeMap();
    
    const types: SchemaObject['types'] = [];
    const enums: SchemaObject['enums'] = [];
    const scalars: string[] = [];
    
    for (const [name, type] of Object.entries(typeMap)) {
      // Skip built-in types
      if (name.startsWith('__')) continue;
      
      if (type.toString().startsWith('enum')) {
        const enumType = schema.getType(name);
        const values = Object.keys((enumType as any)._values || {});
        enums.push({ name, values });
      } else if (type.toString().startsWith('scalar')) {
        scalars.push(name);
      } else if (type.toString().startsWith('type') || type.toString().startsWith('interface')) {
        const objectType = schema.getType(name);
        const fields = Object.entries((objectType as any)._fields || {}).map(([fieldName, field]: [string, any]) => {
          const typeStr = field.type.toString();
          const isList = typeStr.includes('[');
          const isNonNull = typeStr.endsWith('!');
          const baseType = typeStr.replace(/[\[\]!]/g, '');
          
          return {
            name: fieldName,
            type: baseType,
            list: isList,
            nonNull: isNonNull,
            directives: field.astNode?.directives?.map((d: any) => ({
              name: d.name.value,
              args: d.arguments?.map((a: any) => ({
                name: a.name.value,
                value: a.value.kind === 'StringValue' ? a.value.value : a.value.kind
              }))
            }))
          };
        });
        
        types.push({ name, fields });
      }
    }
    
    return { types, enums, scalars };
  } catch (error: unknown) {
    logger.error('Failed to parse schema', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Schema parsing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Format a field's type information
 * 
 * @param field Field object with type, list, and nonNull properties
 * @returns Formatted type string
 */
function formatFieldType(field: { type: string; list?: boolean; nonNull?: boolean }): string {
  let result = field.type;
  if (field.list) {
    result = `[${result}]`;
  }
  if (field.nonNull) {
    result = `${result}!`;
  }
  return result;
}

/**
 * Generate a schema file from a template
 * 
 * @param templatePath Path to the template schema file
 * @param outputPath Path to output the generated schema
 * @param replacements Object with key-value pairs to replace in the template
 * @returns Promise that resolves when the file is written
 */
export async function generateSchemaFromTemplate(
  templatePath: string,
  outputPath: string,
  replacements: Record<string, string>
): Promise<void> {
  try {
    // Read the template schema
    let templateContent = await fs.promises.readFile(templatePath, 'utf8');
    
    // Apply replacements
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      templateContent = templateContent.replace(regex, value);
    }
    
    // Validate the generated schema
    const validation = validateSchema(templateContent);
    if (!validation.valid) {
      throw new Error(`Generated schema is invalid: ${validation.errors?.join(', ')}`);
    }
    
    // Ensure the output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.promises.mkdir(outputDir, { recursive: true });
    
    // Write the output schema
    await fs.promises.writeFile(outputPath, templateContent);
    logger.info('Schema generated successfully', { outputPath });
  } catch (error: unknown) {
    logger.error('Failed to generate schema from template', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Schema generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
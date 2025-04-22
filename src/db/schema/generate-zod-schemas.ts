// src/db/schema/generate-zod-schemas.ts
import { 
  buildSchema, 
  GraphQLSchema, 
  GraphQLObjectType, 
  GraphQLEnumType,
  GraphQLList, 
  GraphQLNonNull, 
  GraphQLScalarType,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLNamedType
} from 'graphql';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';

/**
 * Generate Zod schemas from a GraphQL schema file
 * 
 * @param schemaPath Path to the GraphQL schema file
 * @param outputPath Path to write the generated Zod schemas
 * @returns Promise that resolves when generation is complete
 */
export async function generateZodSchemasFromGraphQL(
  schemaPath: string, 
  outputPath: string
): Promise<void> {
  try {
    logger.info('Generating Zod schemas from GraphQL schema', { 
      schemaPath, 
      outputPath 
    });

    // Read GraphQL schema
    const schemaString = await fs.promises.readFile(schemaPath, 'utf8');
    
    // Parse schema
    const schema = buildSchema(schemaString);
    
    // Generate code
    const zodCode = generateZodCode(schema);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.promises.mkdir(outputDir, { recursive: true });
    
    // Write generated code to file
    await fs.promises.writeFile(outputPath, zodCode, 'utf8');
    
    logger.info('Zod schemas generated successfully', { outputPath });
  } catch (error: unknown) {
    logger.error('Failed to generate Zod schemas', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw new Error(`Zod schema generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate Zod schema code from a GraphQL schema
 * 
 * @param schema GraphQL schema
 * @returns Generated Zod schema code
 */
function generateZodCode(schema: GraphQLSchema): string {
  // Start with imports and header
  let code = `// GENERATED CODE - DO NOT MODIFY
// This file is generated from the GraphQL schema and will be overwritten
// To customize validation, use extension methods on these schemas

import { z } from 'zod';

// Custom scalars
${generateCustomScalars(schema)}

// Enum definitions
${generateEnums(schema)}

// Interface definitions
${generateInterfaces(schema)}

// Type definitions
${generateTypes(schema)}

// Input type definitions
${generateInputTypes(schema)}

// Export all schemas
${generateExports(schema)}
`;

  return code;
}

/**
 * Generate Zod custom scalar definitions
 */
function generateCustomScalars(schema: GraphQLSchema): string {
  const typeMap = schema.getTypeMap();
  const customScalars = Object.values(typeMap).filter(
    type => 
      type instanceof GraphQLScalarType && 
      !['String', 'Int', 'Float', 'Boolean', 'ID'].includes(type.name)
  );
  
  if (customScalars.length === 0) {
    return '// No custom scalars defined';
  }
  
  let code = '';
  
  for (const scalar of customScalars) {
    const name = scalar.name;
    
    // Handle common custom scalars
    if (name === 'DateTime') {
      code += `const dateTimeSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid DateTime format',
});\n\n`;
    } else if (name === 'Date') {
      code += `const dateSchema = z.string().refine((val) => {
  const date = new Date(val);
  return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === val;
}, {
  message: 'Invalid Date format (YYYY-MM-DD required)',
});\n\n`;
    } else if (name === 'JSON') {
      code += `const jsonSchema = z.union([
  z.record(z.any()),
  z.array(z.any()),
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);\n\n`;
    } else if (name === 'URL') {
      code += `const urlSchema = z.string().url();\n\n`;
    } else if (name === 'Email') {
      code += `const emailSchema = z.string().email();\n\n`;
    } else {
      // Default to string for unknown scalars
      code += `const ${name.charAt(0).toLowerCase() + name.slice(1)}Schema = z.string();\n\n`;
    }
  }
  
  return code;
}

/**
 * Generate Zod enum definitions
 */
function generateEnums(schema: GraphQLSchema): string {
  const typeMap = schema.getTypeMap();
  const enums = Object.values(typeMap).filter(type => type instanceof GraphQLEnumType);
  
  if (enums.length === 0) {
    return '// No enums defined';
  }
  
  let code = '';
  
  for (const enumType of enums) {
    const name = enumType.name;
    if (name.startsWith('__')) continue; // Skip internal GraphQL types
    
    const values = (enumType as GraphQLEnumType).getValues().map(val => `'${val.name}'`);
    
    code += `const ${toZodSchemaName(name)} = z.enum([${values.join(', ')}]);\n`;
    code += `type ${name} = z.infer<typeof ${toZodSchemaName(name)}>;\n\n`;
  }
  
  return code;
}

/**
 * Generate Zod interface definitions
 */
function generateInterfaces(schema: GraphQLSchema): string {
  const typeMap = schema.getTypeMap();
  const interfaces = Object.values(typeMap).filter(type => type instanceof GraphQLInterfaceType);
  
  if (interfaces.length === 0) {
    return '// No interfaces defined';
  }
  
  let code = '';
  
  for (const interfaceType of interfaces) {
    const name = interfaceType.name;
    if (name.startsWith('__')) continue; // Skip internal GraphQL types
    
    const fields = (interfaceType as GraphQLInterfaceType).getFields();
    const fieldDefinitions = Object.values(fields).map(field => {
      const fieldType = generateZodTypeForGraphQLField(field);
      return `  ${field.name}: ${fieldType},`;
    });
    
    code += `const ${toZodSchemaName(name)} = z.object({\n${fieldDefinitions.join('\n')}\n});\n`;
    code += `type ${name} = z.infer<typeof ${toZodSchemaName(name)}>;\n\n`;
  }
  
  return code;
}

/**
 * Generate Zod type definitions for GraphQL object types
 */
function generateTypes(schema: GraphQLSchema): string {
  const typeMap = schema.getTypeMap();
  const types = Object.values(typeMap).filter(type => type instanceof GraphQLObjectType);
  
  if (types.length === 0) {
    return '// No object types defined';
  }
  
  let code = '';
  let deferredRelationships: string[] = [];
  
  for (const objectType of types) {
    const name = objectType.name;
    if (name.startsWith('__')) continue; // Skip internal GraphQL types
    
    const fields = (objectType as GraphQLObjectType).getFields();
    const fieldDefinitions = Object.values(fields).map(field => {
      // Basic field definition
      const fieldType = generateZodTypeForGraphQLField(field);
      
      // Check for directives
      const directives = getFieldDirectives(field);
      if (directives.includes('@search')) {
        // Add refinements for searchable fields
        return `  ${field.name}: ${fieldType}.optional(),`;
      } else {
        return `  ${field.name}: ${fieldType},`;
      }
    });
    
    code += `const ${toZodSchemaName(name)} = z.object({\n${fieldDefinitions.join('\n')}\n});\n`;
    code += `type ${name} = z.infer<typeof ${toZodSchemaName(name)}>;\n\n`;
    
    // Check for relationships that need to be handled after all basic types are defined
    Object.values(fields).forEach(field => {
      const typeString = field.type.toString();
      if (typeString.includes('[') || typeString.includes('!')) {
        // This is a relationship or complex type
        if (getFieldDirectives(field).includes('@hasInverse')) {
          // Add to deferred relationships
          deferredRelationships.push(
            `// Relationship: ${name}.${field.name}`
          );
        }
      }
    });
  }
  
  // Add deferred relationships if any
  if (deferredRelationships.length > 0) {
    code += '// Relationship extensions - implement these as needed for specific validation logic\n';
    code += deferredRelationships.join('\n') + '\n\n';
  }
  
  return code;
}

/**
 * Generate Zod type definitions for GraphQL input types
 */
function generateInputTypes(schema: GraphQLSchema): string {
  const typeMap = schema.getTypeMap();
  const inputTypes = Object.values(typeMap).filter(type => type instanceof GraphQLInputObjectType);
  
  if (inputTypes.length === 0) {
    return '// No input types defined';
  }
  
  let code = '';
  
  for (const inputType of inputTypes) {
    const name = inputType.name;
    if (name.startsWith('__')) continue; // Skip internal GraphQL types
    
    const fields = (inputType as GraphQLInputObjectType).getFields();
    const fieldDefinitions = Object.values(fields).map(field => {
      const fieldType = generateZodTypeForGraphQLInputField(field);
      return `  ${field.name}: ${fieldType},`;
    });
    
    code += `const ${toZodSchemaName(name)} = z.object({\n${fieldDefinitions.join('\n')}\n});\n`;
    code += `type ${name} = z.infer<typeof ${toZodSchemaName(name)}>;\n\n`;
  }
  
  return code;
}

/**
 * Generate export statements for all schemas
 */
function generateExports(schema: GraphQLSchema): string {
  const typeMap = schema.getTypeMap();
  const exportableTypes = Object.values(typeMap).filter(type => 
    (type instanceof GraphQLObjectType || 
     type instanceof GraphQLEnumType || 
     type instanceof GraphQLInputObjectType ||
     type instanceof GraphQLInterfaceType) &&
    !type.name.startsWith('__')
  );
  
  if (exportableTypes.length === 0) {
    return '// No types to export';
  }
  
  const exports = exportableTypes.map(type => {
    const name = type.name;
    return `  ${toZodSchemaName(name)},\n  ${name},`;
  });
  
  // Add custom scalar exports
  const customScalars = Object.values(typeMap).filter(
    type => 
      type instanceof GraphQLScalarType && 
      !['String', 'Int', 'Float', 'Boolean', 'ID'].includes(type.name)
  );
  
  const scalarExports = customScalars.map(scalar => {
    const name = scalar.name;
    const schemaName = name.charAt(0).toLowerCase() + name.slice(1) + 'Schema';
    return `  ${schemaName},`;
  });
  
  return `export {\n${exports.join('\n')}\n${scalarExports.join('\n')}\n};\n`;
}

/**
 * Generate a Zod type definition for a GraphQL field
 */
function generateZodTypeForGraphQLField(field: GraphQLField<any, any>): string {
  const type = field.type;
  return generateZodTypeForGraphQLType(type);
}

/**
 * Generate a Zod type definition for a GraphQL input field
 */
function generateZodTypeForGraphQLInputField(field: GraphQLInputField): string {
  const type = field.type;
  return generateZodTypeForGraphQLType(type);
}

/**
 * Generate a Zod type definition for a GraphQL type
 */
function generateZodTypeForGraphQLType(type: any): string {
  if (type instanceof GraphQLNonNull) {
    // Non-null type
    return generateZodTypeForGraphQLType(type.ofType);
  } else if (type instanceof GraphQLList) {
    // List type
    return `z.array(${generateZodTypeForGraphQLType(type.ofType)}).optional()`;
  } else if (type instanceof GraphQLScalarType) {
    // Scalar type
    return mapScalarToZodType(type.name);
  } else if (type instanceof GraphQLEnumType) {
    // Enum type
    return `${toZodSchemaName(type.name)}.optional()`;
  } else if (type instanceof GraphQLObjectType || 
             type instanceof GraphQLInputObjectType || 
             type instanceof GraphQLInterfaceType) {
    // Object, input object, or interface type
    return `${toZodSchemaName(type.name)}.optional()`;
  } else if (type instanceof GraphQLUnionType) {
    // Union type - generate a z.union with all possible types
    const unionTypes = type.getTypes();
    const unionSchemas = unionTypes.map(t => toZodSchemaName(t.name));
    return `z.union([${unionSchemas.join(', ')}]).optional()`;
  } else {
    // Default fallback
    return 'z.any().optional()';
  }
}

/**
 * Map GraphQL scalar types to Zod types
 */
function mapScalarToZodType(scalarName: string): string {
  switch (scalarName) {
    case 'ID':
      return 'z.string().optional()';
    case 'String':
      return 'z.string().optional()';
    case 'Int':
      return 'z.number().int().optional()';
    case 'Float':
      return 'z.number().optional()';
    case 'Boolean':
      return 'z.boolean().optional()';
    case 'DateTime':
      return 'dateTimeSchema.optional()';
    case 'Date':
      return 'dateSchema.optional()';
    case 'JSON':
      return 'jsonSchema.optional()';
    case 'URL':
      return 'urlSchema.optional()';
    case 'Email':
      return 'emailSchema.optional()';
    default:
      // For custom scalars, use their defined schema
      return `${scalarName.charAt(0).toLowerCase() + scalarName.slice(1)}Schema.optional()`;
  }
}

/**
 * Convert a GraphQL type name to a Zod schema name
 */
function toZodSchemaName(typeName: string): string {
  return `${typeName.charAt(0).toLowerCase() + typeName.slice(1)}Schema`;
}

/**
 * Get directives for a field (simplified - would need AST parsing for complete implementation)
 */
function getFieldDirectives(field: GraphQLField<any, any>): string[] {
  // In a real implementation, you would parse the AST to get directives
  // This is a simplified version that checks the description for directive hints
  const description = field.description || '';
  const directives: string[] = [];
  
  if (description.includes('@search')) {
    directives.push('@search');
  }
  
  if (description.includes('@hasInverse')) {
    directives.push('@hasInverse');
  }
  
  return directives;
}

// Main function for CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node generate-zod-schemas.js <schemaPath> <outputPath>');
    process.exit(1);
  }
  
  const [schemaPath, outputPath] = args;
  generateZodSchemasFromGraphQL(schemaPath, outputPath)
    .then(() => {
      console.log(`Zod schemas generated successfully at ${outputPath}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to generate Zod schemas:', error);
      process.exit(1);
    });
}
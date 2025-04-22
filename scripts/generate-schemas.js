#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

// Schema paths
const schemaGraphqlPath = path.join(projectRoot, 'src', 'db', 'schema', 'schema.graphql');
const zodOutputPath = path.join(projectRoot, 'src', 'types', 'generated', 'ckg-schema.ts');

// Ensure the types/generated directory exists
const outputDir = path.dirname(zodOutputPath);
fs.mkdirSync(outputDir, { recursive: true });

// Check if the GraphQL schema exists
if (!fs.existsSync(schemaGraphqlPath)) {
  console.error(`Error: GraphQL schema not found at ${schemaGraphqlPath}`);
  process.exit(1);
}

// Read the GraphQL schema
const graphqlSchema = fs.readFileSync(schemaGraphqlPath, 'utf8');

// Generate a simple Zod schema from the GraphQL schema
function generateZodSchema(graphqlSchema) {
  // Extract type definitions from GraphQL schema
  const types = [];
  const typeRegex = /type\s+(\w+)\s*{([^}]*)}/g;
  let match;
  
  while ((match = typeRegex.exec(graphqlSchema))) {
    const typeName = match[1];
    const typeFields = match[2].trim();
    
    // Skip internal GraphQL types
    if (typeName.startsWith('__')) continue;
    
    // Parse fields
    const fields = [];
    const fieldRegex = /(\w+):\s*([^!\n]*[!\n])/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldRegex.exec(typeFields))) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2].trim();
      fields.push({ name: fieldName, type: fieldType });
    }
    
    types.push({ name: typeName, fields });
  }
  
  // Extract enum definitions
  const enums = [];
  const enumRegex = /enum\s+(\w+)\s*{([^}]*)}/g;
  
  while ((match = enumRegex.exec(graphqlSchema))) {
    const enumName = match[1];
    const enumValues = match[2].trim().split(/\s+/);
    enums.push({ name: enumName, values: enumValues });
  }
  
  // Generate Zod schema code
  let zodCode = `// GENERATED CODE - DO NOT MODIFY
// This file is generated from the GraphQL schema and will be overwritten
// To customize validation, use extension methods on these schemas

import { z } from 'zod';

// Scalar definitions
const dateTimeSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid DateTime format',
});

// Enum definitions
${enums.map(enumType => {
  const values = enumType.values.map(val => `'${val}'`).join(', ');
  return `const ${enumType.name.charAt(0).toLowerCase() + enumType.name.slice(1)}Schema = z.enum([${values}]);\n` +
         `type ${enumType.name} = z.infer<typeof ${enumType.name.charAt(0).toLowerCase() + enumType.name.slice(1)}Schema>;\n`;
}).join('\n')}

// Type definitions
${types.map(type => {
  const fields = type.fields.map(field => {
    let zodType;
    
    // Map GraphQL types to Zod types
    if (field.type.includes('String')) {
      zodType = 'z.string().optional()';
    } else if (field.type.includes('Int')) {
      zodType = 'z.number().int().optional()';
    } else if (field.type.includes('Float')) {
      zodType = 'z.number().optional()';
    } else if (field.type.includes('Boolean')) {
      zodType = 'z.boolean().optional()';
    } else if (field.type.includes('ID')) {
      zodType = 'z.string().optional()';
    } else if (field.type.includes('DateTime')) {
      zodType = 'dateTimeSchema.optional()';
    } else if (field.type.includes('[')) {
      // It's an array type
      const innerType = field.type.replace(/[\[\]]/g, '').trim();
      zodType = `z.array(z.string()).optional()`;
    } else {
      // It's a reference to another type
      const refType = field.type.trim();
      zodType = `${refType.charAt(0).toLowerCase() + refType.slice(1)}Schema.optional()`;
    }
    
    return `  ${field.name}: ${zodType},`;
  }).join('\n');
  
  return `const ${type.name.charAt(0).toLowerCase() + type.name.slice(1)}Schema = z.object({\n${fields}\n});\n` +
         `type ${type.name} = z.infer<typeof ${type.name.charAt(0).toLowerCase() + type.name.slice(1)}Schema>;\n`;
}).join('\n')}

// Export all schemas
export {
${types.map(type => {
  const schemaName = type.name.charAt(0).toLowerCase() + type.name.slice(1) + 'Schema';
  return `  ${schemaName},\n  ${type.name},`;
}).join('\n')}
${enums.map(enumType => {
  const schemaName = enumType.name.charAt(0).toLowerCase() + enumType.name.slice(1) + 'Schema';
  return `  ${schemaName},\n  ${enumType.name},`;
}).join('\n')}
  dateTimeSchema,
};
`;

  return zodCode;
}

// Generate Zod schema
try {
  console.log('Generating Zod schemas from GraphQL schema...');
  const zodSchema = generateZodSchema(graphqlSchema);
  
  // Write to file
  fs.writeFileSync(zodOutputPath, zodSchema);
  console.log(`Zod schemas generated successfully at ${zodOutputPath}`);
} catch (error) {
  console.error('Error generating Zod schemas:', error);
  process.exit(1);
}

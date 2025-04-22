# GraphQL to Zod Schema Generation

This directory contains utilities for generating Zod schemas from GraphQL schema definitions. This approach ensures that the GraphQL schema (used for Dgraph) and Zod schemas (used for TypeScript validation) stay in sync, eliminating the need to manually maintain two separate schema systems.

## How It Works

1. **Single Source of Truth**: The GraphQL schema (`schema.graphql`) serves as the single source of truth for all type definitions.

2. **Automatic Generation**: The `generate-zod-schemas.ts` utility parses the GraphQL schema and generates corresponding Zod schemas.

3. **Seamless Integration**: The generated Zod schemas are automatically used by the MCP tools for validation of inputs and outputs.

## Benefits

- **No Schema Drift**: Eliminates the possibility of GraphQL and Zod schemas getting out of sync
- **Reduced Maintenance**: Only need to update the GraphQL schema, Zod schemas are generated automatically
- **Type Safety**: Full TypeScript type safety through generated Zod schemas
- **Consistent Validation**: Same validation rules applied at database and application levels

## Usage

### Initialize Schema and Generate Zod

```bash
# Initialize Dgraph schema and generate Zod schemas
npm run schema:init

# Initialize without generating Zod schemas
npm run schema:init-no-zod
```

### Generate Zod Schemas Only

```bash
# Generate Zod schemas without modifying Dgraph
npm run schema:generate-zod

# Specify custom input and output paths
npm run schema:generate-zod -- -s ./custom-schema.graphql -o ./custom-output.ts
```

### Programmatic Usage

```typescript
import { initSchemaAndGenerateZod, updateZodSchemasOnly } from './db/schema/init-wrapper';

// Initialize schema and generate Zod schemas
await initSchemaAndGenerateZod({
  schemaPath: './schema.graphql',
  dgraphAddress: 'localhost:9080',
  dropAll: false,
  generateZod: true,
  zodOutputPath: './types/generated/ckg-schema.ts'
});

// Only generate Zod schemas
await updateZodSchemasOnly('./schema.graphql', './types/generated/ckg-schema.ts');
```

## Generated Code

The generated Zod schemas file includes:

1. **Custom Scalars**: Zod schemas for GraphQL scalars like DateTime, JSON, etc.
2. **Enum Definitions**: Zod enums corresponding to GraphQL enums
3. **Interface Definitions**: Zod objects for GraphQL interfaces
4. **Type Definitions**: Zod objects for GraphQL object types
5. **Input Type Definitions**: Zod objects for GraphQL input types
6. **TypeScript Types**: TypeScript types inferred from Zod schemas

## Customizing Validation

While the basic structure is automatically generated from the GraphQL schema, you can extend the generated Zod schemas with custom validation logic:

```typescript
import { projectSchema, Project } from './types/generated/ckg-schema';

// Extend the generated schema with custom validation
const extendedProjectSchema = projectSchema.extend({
  name: projectSchema.shape.name.refine(
    name => name.length >= 3,
    { message: 'Project name must be at least 3 characters long' }
  )
});

// Use the extended schema for validation
function validateProject(project: Project) {
  return extendedProjectSchema.parse(project);
}
```

## Continuous Integration

A CI check script is provided to ensure that the Zod schemas are always in sync with the GraphQL schema:

```bash
# Run the schema sync check
npm run schema:check-sync
```

This script:
1. Generates fresh Zod schemas from the current GraphQL schema
2. Compares them with the committed Zod schemas
3. Fails if differences are found, showing a helpful diff

Add this check to your CI pipeline to ensure that any changes to the GraphQL schema are reflected in the Zod schemas before merging a pull request. For example, in GitHub Actions:

```yaml
# .github/workflows/schema-check.yml
name: Check Schema Sync

on:
  pull_request:
    paths:
      - 'src/db/schema/**'
      - 'src/types/generated/**'

jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run schema:check-sync
```

This would run automatically whenever changes are made to the schema files or generated types.
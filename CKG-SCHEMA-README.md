# CKG Schema Implementation for Warp Agent System

This implementation provides the foundation for the Code Knowledge Graph (CKG) used by the Warp Agent System. It includes a GraphQL schema for Dgraph and automatic generation of Zod schemas for TypeScript validation.

## Overview

The CKG schema implementation follows a dual schema approach:
- **GraphQL SDL**: Defines the database schema structure in Dgraph
- **Zod Schemas**: Generated from GraphQL for TypeScript runtime validation

This approach solves the potential coupling issue between GraphQL and Zod schemas by using GraphQL as the single source of truth and automatically generating the corresponding Zod schemas.

## Key Components

### 1. Schema Initialization

- **`init-schema.ts`**: Core script for initializing the Dgraph schema
- **`schema-types.ts`**: Zod schema definitions for validation
- **`schema-validator.ts`**: Utilities for validating GraphQL schema
- **`schema-utils.ts`**: Utilities for comparing schemas and managing updates
- **`init-wrapper.ts`**: Wrapper for initializing schema and generating Zod schemas

### 2. Zod Schema Generation

- **`generate-zod-schemas.ts`**: Automatically generates Zod schemas from GraphQL
- Handles complex GraphQL types (objects, enums, interfaces, scalars)
- Maps GraphQL types to appropriate Zod validation schemas
- Generates TypeScript types from Zod schemas

### 3. CLI Interface

- **`cli.ts`**: Command-line tools for schema operations
- Commands: `init`, `check`, `export`, `generate-zod`
- Options for customizing schema paths, Dgraph connection, etc.

### 4. MCP Integration

- **`mcp-integration.ts`**: Integration with MCP server
- Automates schema initialization during server startup
- Provides endpoints for schema management

### 5. Sample Implementation

- **`query_ckg.ts`**: Example implementation using generated Zod schemas
- Shows how to use the schemas for input/output validation

## Usage

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Schema**:
   ```bash
   npm run schema:init
   ```

3. **Generate Zod Schemas**:
   ```bash
   npm run schema:generate-zod
   ```

4. **Check Schema Sync**:
   ```bash
   npm run schema:check-sync
   ```

## Benefits

- **Single Source of Truth**: GraphQL schema is the only schema to maintain
- **Automatic Synchronization**: Zod schemas are generated automatically
- **Type Safety**: Full TypeScript type safety with minimal maintenance
- **Consistent Validation**: Same validation rules applied throughout the application

## Next Steps

1. **Implement query_ckg and update_ckg** tools that use the generated Zod schemas
2. **Create extended validation schemas** for specific business rules
3. **Set up CI checks** to ensure schemas stay in sync

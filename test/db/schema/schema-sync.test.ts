// test/db/schema/schema-sync.test.ts
import fs from 'fs';
import path from 'path';
import { buildSchema, GraphQLSchema } from 'graphql';
import os from 'os';
import { generateZodSchemasFromGraphQL } from '../../../src/db/schema/generate-zod-schemas';

// Mock the logger to avoid console output during tests
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    level: 'error'
  }
}));

describe('Schema Synchronization', () => {
  // Set up temp directory for test files
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-test-'));
  const schemaPath = path.join(tempDir, 'test-schema.graphql');
  const zodOutputPath = path.join(tempDir, 'test-zod-schema.ts');
  
  afterAll(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  
  test('generates valid Zod schemas from GraphQL schema', async () => {
    // Create a test GraphQL schema
    const testSchema = `
      type Project {
        id: ID!
        name: String! @search(by: [term, exact])
        description: String
        createdAt: DateTime
        tasks: [Task] @hasInverse(field: project)
      }
      
      type Task {
        id: ID!
        title: String! @search(by: [term, exact])
        description: String
        status: TaskStatus!
        project: Project!
      }
      
      enum TaskStatus {
        TODO
        IN_PROGRESS
        DONE
      }
      
      scalar DateTime
    `;
    
    // Write test schema to file
    fs.writeFileSync(schemaPath, testSchema);
    
    // Generate Zod schemas
    await generateZodSchemasFromGraphQL(schemaPath, zodOutputPath);
    
    // Verify the Zod schema file was created
    expect(fs.existsSync(zodOutputPath)).toBe(true);
    
    // Read the generated file
    const generatedCode = fs.readFileSync(zodOutputPath, 'utf8');
    
    // Check for key components
    expect(generatedCode).toContain('// GENERATED CODE - DO NOT MODIFY');
    expect(generatedCode).toContain('import { z } from \'zod\';');
    expect(generatedCode).toContain('const projectSchema = z.object({');
    expect(generatedCode).toContain('const taskSchema = z.object({');
    expect(generatedCode).toContain('const taskStatusSchema = z.enum([');
    
    // Ensure all GraphQL types are represented in the Zod schema
    expect(generatedCode).toContain('\'TODO\'');
    expect(generatedCode).toContain('\'IN_PROGRESS\'');
    expect(generatedCode).toContain('\'DONE\'');
    
    // Check for correct relationships
    expect(generatedCode).toContain('project:');
    expect(generatedCode).toContain('tasks:');
  });
  
  test('regenerates Zod schemas when GraphQL schema changes', async () => {
    // Initial schema
    const initialSchema = `
      type User {
        id: ID!
        name: String!
      }
    `;
    
    // Write initial schema
    fs.writeFileSync(schemaPath, initialSchema);
    
    // Generate initial Zod schemas
    await generateZodSchemasFromGraphQL(schemaPath, zodOutputPath);
    
    // Check initial generation
    const initialGenerated = fs.readFileSync(zodOutputPath, 'utf8');
    expect(initialGenerated).toContain('const userSchema = z.object({');
    
    // Updated schema with new type
    const updatedSchema = `
      type User {
        id: ID!
        name: String!
        email: String
      }
      
      type Post {
        id: ID!
        title: String!
        author: User!
      }
    `;
    
    // Write updated schema
    fs.writeFileSync(schemaPath, updatedSchema);
    
    // Regenerate Zod schemas
    await generateZodSchemasFromGraphQL(schemaPath, zodOutputPath);
    
    // Check updated generation
    const updatedGenerated = fs.readFileSync(zodOutputPath, 'utf8');
    expect(updatedGenerated).toContain('const userSchema = z.object({');
    expect(updatedGenerated).toContain('email:');
    expect(updatedGenerated).toContain('const postSchema = z.object({');
    expect(updatedGenerated).toContain('author:');
  });
});

describe('Schema E2E Test', () => {
  // This test requires a running Dgraph instance
  // Skip it if Dgraph is not available or in CI environment
  const runE2ETests = process.env.RUN_E2E_TESTS === 'true';
  
  (runE2ETests ? test : test.skip)('initializes schema in Dgraph', async () => {
    // Import these dynamically to avoid connection attempts during other tests
    const { initSchema } = require('../../../src/db/schema/init-schema');
    const { checkSchema } = require('../../../src/db/schema/schema-utils');
    const { createDgraphClient } = require('../../../src/db/dgraph');
    
    // Create a temporary schema file
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-test-'));
    const schemaPath = path.join(tempDir, 'test-schema.graphql');
    
    // Write a test schema to the file
    fs.writeFileSync(schemaPath, `
      type Project {
        id: ID!
        name: String! @search(by: [term, exact])
        description: String
      }
    `);
    
    try {
      // Initialize the schema
      await initSchema({
        schemaPath,
        dropAll: true, // Always start with a clean database for tests
        logLevel: 'error'
      });
      
      // Check if the schema was initialized correctly
      const client = createDgraphClient();
      const status = await checkSchema(client, schemaPath);
      
      expect(status.exists).toBe(true);
      expect(status.needsUpdate).toBe(false);
    } finally {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }, 30000); // Increase timeout for this test
});
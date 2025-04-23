/**
 * Schema Update Utility
 * 
 * This utility updates the Dgraph schema to support hierarchical tasks,
 * scope-based configuration, and time-based traversal.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GraphDatabase } from '../dgraph.js';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define configuration
const DB_PATH = process.env.WARP_LOCAL_DB_PATH || 
  path.join(process.cwd(), '.warp_memory');
const DGRAPH_URL = process.env.WARP_DGRAPH_URL || 'localhost:9080';

/**
 * Update schema in Dgraph
 */
async function updateSchema() {
  try {
    console.log('Initializing GraphDatabase...');
    const graphDb = new GraphDatabase(DGRAPH_URL, DB_PATH);
    await graphDb.initialize();
    
    // Read schema file
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'schema.graphql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Updating schema in Dgraph...');
    const result = await graphDb.applySchema(schemaContent);
    
    console.log('Schema updated successfully!');
    console.log('Result:', result);
    
    // Create indexes if needed
    console.log('Creating indexes...');
    await createIndexes(graphDb);
    
    console.log('Schema update complete!');
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  }
}

/**
 * Create necessary indexes in Dgraph
 */
async function createIndexes(graphDb: GraphDatabase) {
  try {
    // Skip index creation for local database
    if (graphDb.useFallback) {
      console.log('Skipping index creation for local database');
      return;
    }
    
    // Only proceed with Dgraph
    if (graphDb.dgraphClient) {
      // Create indexes for TimePoint timestamps
      const createTimePointIndexQuery = `
        <TimePoint.timestamp>: datetime @index(hour) .
        <TimePoint.entityId>: string @index(exact) .
        <TimePoint.entityType>: string @index(exact) .
        <TimePoint.eventType>: string @index(exact) .
      `;
      
      await graphDb.dgraphClient.alterSchema(createTimePointIndexQuery);
      console.log('TimePoint indexes created');
      
      // Create indexes for scope resolution
      const createScopeIndexQuery = `
        <Rule.scope>: string @index(exact) .
        <Rule.isActive>: bool @index(bool) .
        <Workflow.scope>: string @index(exact) .
        <Workflow.isActive>: bool @index(bool) .
        <Persona.scope>: string @index(exact) .
        <Persona.isActive>: bool @index(bool) .
      `;
      
      await graphDb.dgraphClient.alterSchema(createScopeIndexQuery);
      console.log('Scope indexes created');
      
      // Create indexes for hierarchical tasks
      const createTaskIndexQuery = `
        <Task.taskLevel>: string @index(exact) .
        <Task.scopeContext>: string @index(term) .
      `;
      
      await graphDb.dgraphClient.alterSchema(createTaskIndexQuery);
      console.log('Task hierarchy indexes created');
    } else {
      console.log('Skipping index creation: Not using Dgraph');
    }
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}

// Run the update if this file is executed directly (ES module version)
const isMainModule = import.meta.url.startsWith('file:') && 
  import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  updateSchema().then(() => {
    console.log('Schema update script completed');
    process.exit(0);
  }).catch(error => {
    console.error('Schema update failed:', error);
    process.exit(1);
  });
}

export { updateSchema };

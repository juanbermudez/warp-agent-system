#!/usr/bin/env node

/**
 * Add Activity Schema to CKG Schema
 * 
 * This script adds the activity schema to the main CKG schema.
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const MAIN_SCHEMA_PATH = path.resolve(process.cwd(), 'src', 'db', 'schema', 'schema.graphql');
const ACTIVITY_SCHEMA_PATH = path.resolve(process.cwd(), 'src', 'schema', 'activity-schema.graphql');
const BACKUP_SCHEMA_PATH = path.join(process.cwd(), 'src', 'db', 'schema', 'schema.graphql.bak');

/**
 * Check if the activity schema is already integrated
 */
async function isActivitySchemaIntegrated(schemaContent: string): Promise<boolean> {
  return schemaContent.includes('type Activity implements Entity');
}

/**
 * Main function to add the activity schema
 */
async function addActivitySchema(): Promise<void> {
  // Print current working directory for debugging
  console.log(`Current working directory: ${process.cwd()}`);
  try {
    console.log('Starting activity schema integration...');
    
    // Check if files exist
    try {
      await fs.access(MAIN_SCHEMA_PATH);
      console.log(`Main schema exists at ${MAIN_SCHEMA_PATH}`);
    } catch (err) {
      console.error(`Main schema file not found at ${MAIN_SCHEMA_PATH}`);
      throw new Error(`Main schema file not found: ${err.message}`);
    }
    
    try {
      await fs.access(ACTIVITY_SCHEMA_PATH);
      console.log(`Activity schema exists at ${ACTIVITY_SCHEMA_PATH}`);
    } catch (err) {
      console.error(`Activity schema file not found at ${ACTIVITY_SCHEMA_PATH}`);
      throw new Error(`Activity schema file not found: ${err.message}`);
    }
    
    // Read schema files
    console.log(`Reading main schema from ${MAIN_SCHEMA_PATH}`);
    const mainSchemaContent = await fs.readFile(MAIN_SCHEMA_PATH, 'utf-8');
    console.log(`Main schema read successfully (${mainSchemaContent.length} bytes)`);
    
    console.log(`Reading activity schema from ${ACTIVITY_SCHEMA_PATH}`);
    const activitySchemaContent = await fs.readFile(ACTIVITY_SCHEMA_PATH, 'utf-8');
    console.log(`Activity schema read successfully (${activitySchemaContent.length} bytes)`);
    
    // Check if already integrated
    console.log('Checking if activity schema is already integrated...');
    if (await isActivitySchemaIntegrated(mainSchemaContent)) {
      console.log('Activity schema is already integrated. No changes needed.');
      return;
    }
    console.log('Activity schema not found in main schema, proceeding with integration.');
    
    // Create a backup of the main schema
    await fs.writeFile(BACKUP_SCHEMA_PATH, mainSchemaContent, 'utf-8');
    console.log(`Backup created at ${BACKUP_SCHEMA_PATH}`);
    
    // Append activity schema to main schema
    const combinedSchema = `${mainSchemaContent}\n\n# Activity Tracking Schema\n${activitySchemaContent}`;
    await fs.writeFile(MAIN_SCHEMA_PATH, combinedSchema, 'utf-8');
    console.log('Activity schema integrated successfully');
    
    // Run schema initialization script
    console.log('Initializing schema with new activity types...');
    try {
      execSync('npm run schema:init', { stdio: 'inherit' });
      console.log('Schema initialization completed successfully');
    } catch (err) {
      console.error('Error running schema initialization:', err.message);
      throw new Error(`Schema initialization failed: ${err.message}`);
    }
    
    // Generate Zod schemas
    console.log('Generating Zod schemas...');
    try {
      execSync('npm run schema:generate-zod', { stdio: 'inherit' });
      console.log('Zod schema generation completed successfully');
    } catch (err) {
      console.error('Error generating Zod schemas:', err.message);
      throw new Error(`Zod schema generation failed: ${err.message}`);
    }
    
    console.log('Activity schema integration completed successfully!');
  } catch (error) {
    console.error('Error integrating activity schema:', error);
    
    // Try to restore backup if it exists
    try {
      const backupExists = await fs.stat(BACKUP_SCHEMA_PATH).then(() => true).catch(() => false);
      if (backupExists) {
        await fs.copyFile(BACKUP_SCHEMA_PATH, MAIN_SCHEMA_PATH);
        console.log('Restored main schema from backup');
      }
    } catch (restoreError) {
      console.error('Error restoring backup:', restoreError);
    }
    
    process.exit(1);
  }
}

// Execute if this script is run directly
if (require.main === module) {
  addActivitySchema().catch(console.error);
}

export { addActivitySchema };

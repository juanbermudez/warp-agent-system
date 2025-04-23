#!/usr/bin/env node

/**
 * Migrate Activities to CKG
 * 
 * This script migrates activity data from the file-based storage system
 * to the Code Knowledge Graph (CKG) database.
 */

import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { ActivityTrackerCKG } from '../services/activity/activity-tracker-ckg';
import { Activity, ActivityGroup } from '../services/activity/types-ckg';
import { glob } from 'glob';

// Constants
const WARP_MEMORY_DIR = '.warp_memory';
const ACTIVITIES_DIR = 'activities';
const ACTIVITY_GROUPS_DIR = 'activity_groups';
const INDEXES_DIR = 'activity_indexes';

// Create activity tracker instance
const activityTracker = new ActivityTrackerCKG();

/**
 * Main migration function
 */
async function migrateActivities(rootPath: string): Promise<void> {
  console.log('Starting migration of activities to CKG...');
  
  // Validate paths
  const activitiesPath = path.join(rootPath, WARP_MEMORY_DIR, ACTIVITIES_DIR);
  const groupsPath = path.join(rootPath, WARP_MEMORY_DIR, ACTIVITY_GROUPS_DIR);
  
  try {
    // Check if directories exist
    await fs.access(activitiesPath);
    console.log(`Found activities directory: ${activitiesPath}`);
  } catch (error) {
    console.log('No activities directory found, skipping activity migration.');
    return;
  }
  
  try {
    // Check if groups directory exists
    await fs.access(groupsPath);
    console.log(`Found activity groups directory: ${groupsPath}`);
  } catch (error) {
    console.log('No activity groups directory found, skipping group migration.');
  }
  
  // Migrate activity groups first (they need to exist before linking activities to them)
  await migrateActivityGroups(groupsPath);
  
  // Then migrate activities
  await migrateActivityFiles(activitiesPath);
  
  console.log('Migration completed successfully!');
}

/**
 * Migrate activity groups
 */
async function migrateActivityGroups(groupsPath: string): Promise<void> {
  console.log('Migrating activity groups...');
  
  try {
    // Get all group files
    const groupFiles = await promisify(glob)('*.json', { cwd: groupsPath });
    console.log(`Found ${groupFiles.length} activity groups to migrate.`);
    
    // Process each group file
    let migrated = 0;
    let errors = 0;
    
    for (const file of groupFiles) {
      try {
        // Read group data
        const filePath = path.join(groupsPath, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const group = JSON.parse(data) as ActivityGroup;
        
        // Create group in CKG
        // Note: We use the same ID to maintain references
        await activityTracker.createActivityGroup(group);
        migrated++;
        
        console.log(`Migrated group: ${group.id}`);
      } catch (error) {
        console.error(`Error migrating group ${file}:`, error);
        errors++;
      }
    }
    
    console.log(`Activity groups migration completed:`);
    console.log(`- Migrated: ${migrated}`);
    console.log(`- Errors: ${errors}`);
  } catch (error) {
    console.error('Error migrating activity groups:', error);
  }
}

/**
 * Migrate activity files
 */
async function migrateActivityFiles(activitiesPath: string): Promise<void> {
  console.log('Migrating activity files...');
  
  try {
    // Get all activity files
    const activityFiles = await promisify(glob)('*.json', { cwd: activitiesPath });
    console.log(`Found ${activityFiles.length} activities to migrate.`);
    
    // Process each activity file
    let migrated = 0;
    let errors = 0;
    
    for (const file of activityFiles) {
      try {
        // Read activity data
        const filePath = path.join(activitiesPath, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const activity = JSON.parse(data) as Activity;
        
        // Create activity in CKG
        // Note: We use the same ID to maintain references
        await activityTracker.logActivity(activity);
        migrated++;
        
        console.log(`Migrated activity: ${activity.id}`);
      } catch (error) {
        console.error(`Error migrating activity ${file}:`, error);
        errors++;
      }
    }
    
    console.log(`Activities migration completed:`);
    console.log(`- Migrated: ${migrated}`);
    console.log(`- Errors: ${errors}`);
  } catch (error) {
    console.error('Error migrating activities:', error);
  }
}

// Main execution
if (require.main === module) {
  // Get root path from args or use current directory
  const rootPath = process.argv[2] || process.cwd();
  migrateActivities(rootPath).catch(console.error);
}

export { migrateActivities };

/**
 * Data Migration Utility
 * 
 * This utility migrates existing data to the updated schema, converting SubTasks to Tasks,
 * adding scope and time-related properties, and establishing hierarchical relationships.
 */

import { GraphDatabase } from '../dgraph.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define configuration
const DB_PATH = process.env.WARP_LOCAL_DB_PATH || join(process.cwd(), '.warp_memory');
const DGRAPH_URL = process.env.WARP_DGRAPH_URL || 'localhost:9080';

/**
 * Migrate data to the updated schema
 */
async function migrateData() {
  try {
    console.log('Initializing GraphDatabase...');
    const graphDb = new GraphDatabase(DGRAPH_URL, DB_PATH);
    await graphDb.initialize();
    
    console.log('Starting data migration...');
    
    // 1. Migrate Task records - add taskLevel property
    await migrateTaskLevels(graphDb);
    
    // 2. Migrate SubTask records to Task records
    await migrateSubTasksToTasks(graphDb);
    
    // 3. Add default scope to Rules, Workflows, and Personas
    await migrateConfigScope(graphDb);
    
    // 4. Add TimePoint entities for major events
    await migrateTimePoints(graphDb);
    
    console.log('Data migration complete!');
  } catch (error) {
    console.error('Error migrating data:', error);
    process.exit(1);
  }
}

/**
 * Migrate Task records to add taskLevel property
 */
async function migrateTaskLevels(graphDb: GraphDatabase) {
  console.log('Migrating Task levels...');
  
  try {
    // Skip for local database
    if (graphDb.useFallback) {
      console.log('Using local database fallback for task level migration');
      console.log('Task level migration skipped for local database');
      return;
    }
    
    // Find all Tasks without taskLevel
    const query = `
      query {
        tasks(func: type(Task)) @filter(NOT has(Task.taskLevel)) {
          uid
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query);
    
    if (!result.tasks || !Array.isArray(result.tasks) || result.tasks.length === 0) {
      console.log('No Tasks found that need taskLevel migration');
      return;
    }
    
    console.log(`Found ${result.tasks.length} Tasks that need taskLevel migration`);
    
    // Update tasks in batches to add taskLevel
    const BATCH_SIZE = 100;
    const batches = [];
    
    for (let i = 0; i < result.tasks.length; i += BATCH_SIZE) {
      batches.push(result.tasks.slice(i, i + BATCH_SIZE));
    }
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const mutation = {
        set: batch.map(task => ({
          uid: task.uid,
          'Task.taskLevel': 'TASK'
        }))
      };
      
      await graphDb.executeMutation(mutation);
      console.log(`Migrated batch ${i+1}/${batches.length} of Tasks`);
    }
    
    console.log('Task level migration complete');
  } catch (error) {
    console.error('Error migrating Task levels:', error);
    throw error;
  }
}

/**
 * Migrate SubTask records to Task records
 */
async function migrateSubTasksToTasks(graphDb: GraphDatabase) {
  console.log('Migrating SubTasks to Tasks...');
  
  try {
    // Skip for local database
    if (graphDb.useFallback) {
      console.log('Using local database fallback for SubTask migration');
      console.log('SubTask migration skipped for local database');
      return;
    }
    
    // Find all SubTasks
    const query = `
      query {
        subtasks(func: type(SubTask)) {
          uid
          SubTask.title
          SubTask.description
          SubTask.status
          SubTask.type
          SubTask.parentTask {
            uid
          }
          SubTask.dependencies {
            uid
          }
          SubTask.assignedRole
          SubTask.assignedTo {
            uid
          }
          SubTask.createdAt
          SubTask.updatedAt
          SubTask.ckgLinks
          SubTask.commandDetails
        }
      }
    `;
    
    const result = await graphDb.executeQuery(query);
    
    if (!result.subtasks || !Array.isArray(result.subtasks) || result.subtasks.length === 0) {
      console.log('No SubTasks found for migration');
      return;
    }
    
    console.log(`Found ${result.subtasks.length} SubTasks to migrate`);
    
    // Process each SubTask and create a corresponding Task
    const BATCH_SIZE = 50;
    const batches = [];
    
    for (let i = 0; i < result.subtasks.length; i += BATCH_SIZE) {
      batches.push(result.subtasks.slice(i, i + BATCH_SIZE));
    }
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const taskMutations = [];
      
      for (const subtask of batch) {
        // Create Task from SubTask
        taskMutations.push({
          uid: subtask.uid,
          'dgraph.type': 'Task',
          'Task.title': subtask['SubTask.title'],
          'Task.description': subtask['SubTask.description'],
          'Task.status': subtask['SubTask.status'],
          'Task.taskLevel': 'SUBTASK',
          'Task.createdAt': subtask['SubTask.createdAt'],
          'Task.updatedAt': subtask['SubTask.updatedAt'],
          // Add relationships
          'Task.parentTask': subtask['SubTask.parentTask'] ? { uid: subtask['SubTask.parentTask'].uid } : null,
          'Task.assignedTo': subtask['SubTask.assignedTo'] ? { uid: subtask['SubTask.assignedTo'].uid } : null,
          // Add custom properties as metadata
          'Task.metadata': JSON.stringify({
            subTaskType: subtask['SubTask.type'],
            assignedRole: subtask['SubTask.assignedRole'],
            ckgLinks: subtask['SubTask.ckgLinks'],
            commandDetails: subtask['SubTask.commandDetails']
          })
        });
        
        // Add dependencies as Task dependencies
        if (subtask['SubTask.dependencies'] && Array.isArray(subtask['SubTask.dependencies'])) {
          taskMutations[taskMutations.length - 1]['Task.dependencies'] = subtask['SubTask.dependencies'].map(dep => ({
            uid: dep.uid
          }));
        }
      }
      
      // Execute mutation to create Tasks
      const mutation = {
        set: taskMutations
      };
      
      await graphDb.executeMutation(mutation);
      console.log(`Migrated batch ${i+1}/${batches.length} of SubTasks to Tasks`);
    }
    
    console.log('SubTask to Task migration complete');
  } catch (error) {
    console.error('Error migrating SubTasks to Tasks:', error);
    throw error;
  }
}

/**
 * Add default scope to Rules, Workflows, and Personas
 */
async function migrateConfigScope(graphDb: GraphDatabase) {
  console.log('Migrating configuration scope...');
  
  try {
    // Skip for local database
    if (graphDb.useFallback) {
      console.log('Using local database fallback for configuration scope migration');
      console.log('Configuration scope migration skipped for local database');
      return;
    }
    
    // Migrate Rules
    await migrateEntityScope(graphDb, 'Rule');
    
    // Migrate Workflows
    await migrateEntityScope(graphDb, 'Workflow');
    
    // Migrate Personas
    await migrateEntityScope(graphDb, 'Persona');
    
    console.log('Configuration scope migration complete');
  } catch (error) {
    console.error('Error migrating configuration scope:', error);
    throw error;
  }
}

/**
 * Migrate scope for a specific entity type
 */
async function migrateEntityScope(graphDb: GraphDatabase, entityType: string) {
  console.log(`Migrating ${entityType} scope...`);
  
  // Find all entities of this type without scope
  const query = `
    query {
      entities(func: type(${entityType})) @filter(NOT has(${entityType}.scope)) {
        uid
      }
    }
  `;
  
  const result = await graphDb.executeQuery(query);
  
  if (!result.entities || !Array.isArray(result.entities) || result.entities.length === 0) {
    console.log(`No ${entityType} entities found that need scope migration`);
    return;
  }
  
  console.log(`Found ${result.entities.length} ${entityType} entities that need scope migration`);
  
  // Update entities in batches to add scope
  const BATCH_SIZE = 100;
  const batches = [];
  
  for (let i = 0; i < result.entities.length; i += BATCH_SIZE) {
    batches.push(result.entities.slice(i, i + BATCH_SIZE));
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const mutation = {
      set: batch.map(entity => ({
        uid: entity.uid,
        [`${entityType}.scope`]: 'DEFAULT',
        [`${entityType}.isActive`]: true
      }))
    };
    
    await graphDb.executeMutation(mutation);
    console.log(`Migrated batch ${i+1}/${batches.length} of ${entityType} entities`);
  }
}

/**
 * Add TimePoint entities for major events
 */
async function migrateTimePoints(graphDb: GraphDatabase) {
  console.log('Migrating time points...');
  
  try {
    // Skip for local database
    if (graphDb.useFallback) {
      console.log('Using local database fallback for time points migration');
      console.log('Time points migration skipped for local database');
      return;
    }
    
    // Find all entities with creation or modification dates
    const entityTypes = ['Task', 'Project', 'Rule', 'Workflow', 'Persona'];
    
    for (const entityType of entityTypes) {
      await migrateEntityTimePoints(graphDb, entityType);
    }
    
    console.log('Time point migration complete');
  } catch (error) {
    console.error('Error migrating time points:', error);
    throw error;
  }
}

/**
 * Migrate time points for a specific entity type
 */
async function migrateEntityTimePoints(graphDb: GraphDatabase, entityType: string) {
  console.log(`Migrating ${entityType} time points...`);
  
  // Find all entities of this type with creation dates
  const query = `
    query {
      entities(func: type(${entityType})) @filter(has(${entityType}.createdAt)) {
        uid
        ${entityType}.createdAt
        ${entityType}.updatedAt
        ${entityType}.status
      }
    }
  `;
  
  const result = await graphDb.executeQuery(query);
  
  if (!result.entities || !Array.isArray(result.entities) || result.entities.length === 0) {
    console.log(`No ${entityType} entities found with dates for time point migration`);
    return;
  }
  
  console.log(`Found ${result.entities.length} ${entityType} entities for time point migration`);
  
  // Process entities in batches
  const BATCH_SIZE = 50;
  const batches = [];
  
  for (let i = 0; i < result.entities.length; i += BATCH_SIZE) {
    batches.push(result.entities.slice(i, i + BATCH_SIZE));
  }
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const timePointMutations = [];
    const relationMutations = [];
    
    for (const entity of batch) {
      // Create TimePoint for creation event
      if (entity[`${entityType}.createdAt`]) {
        const creationTimePointId = uuidv4();
        
        timePointMutations.push({
          uid: creationTimePointId,
          'dgraph.type': 'TimePoint',
          'TimePoint.timestamp': entity[`${entityType}.createdAt`],
          'TimePoint.entityId': entity.uid,
          'TimePoint.entityType': entityType,
          'TimePoint.eventType': 'CREATION'
        });
        
        relationMutations.push({
          uid: entity.uid,
          [`${entityType}.creationTimePoint`]: {
            uid: creationTimePointId
          }
        });
      }
      
      // Create TimePoint for modification event
      if (entity[`${entityType}.updatedAt`] && 
          entity[`${entityType}.updatedAt`] !== entity[`${entityType}.createdAt`]) {
        const modificationTimePointId = uuidv4();
        
        timePointMutations.push({
          uid: modificationTimePointId,
          'dgraph.type': 'TimePoint',
          'TimePoint.timestamp': entity[`${entityType}.updatedAt`],
          'TimePoint.entityId': entity.uid,
          'TimePoint.entityType': entityType,
          'TimePoint.eventType': 'MODIFICATION'
        });
        
        relationMutations.push({
          uid: entity.uid,
          [`${entityType}.modificationTimePoints`]: [
            {
              uid: modificationTimePointId
            }
          ]
        });
      }
      
      // Create TimePoint for status change event (tasks only)
      if (entityType === 'Task' && entity[`${entityType}.status`] && 
          entity[`${entityType}.status`] !== 'TODO') {
        const statusTimePointId = uuidv4();
        
        timePointMutations.push({
          uid: statusTimePointId,
          'dgraph.type': 'TimePoint',
          'TimePoint.timestamp': entity[`${entityType}.updatedAt`] || new Date().toISOString(),
          'TimePoint.entityId': entity.uid,
          'TimePoint.entityType': entityType,
          'TimePoint.eventType': 'STATUS_CHANGE',
          'TimePoint.metadata': JSON.stringify({
            newStatus: entity[`${entityType}.status`]
          })
        });
        
        relationMutations.push({
          uid: entity.uid,
          [`${entityType}.statusChangeTimePoints`]: [
            {
              uid: statusTimePointId
            }
          ]
        });
      }
    }
    
    // Execute mutation to create TimePoints
    if (timePointMutations.length > 0) {
      const timePointMutation = {
        set: timePointMutations
      };
      
      await graphDb.executeMutation(timePointMutation);
    }
    
    // Execute mutation to create relationships
    if (relationMutations.length > 0) {
      const relationMutation = {
        set: relationMutations
      };
      
      await graphDb.executeMutation(relationMutation);
    }
    
    console.log(`Migrated batch ${i+1}/${batches.length} of ${entityType} time points`);
  }
}

// Run the migration if this file is executed directly (ES Module version)
const isMainModule = import.meta.url.startsWith('file:') && 
  import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  migrateData().then(() => {
    console.log('Data migration script completed');
    process.exit(0);
  }).catch(error => {
    console.error('Data migration failed:', error);
    process.exit(1);
  });
}

export { migrateData };

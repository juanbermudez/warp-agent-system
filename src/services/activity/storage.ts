/**
 * Activity Storage Service
 * 
 * Handles the persistence of activities and activity groups to the file system,
 * manages indexes for efficient querying, and provides retrieval methods.
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Activity, ActivityGroup } from './types';

/**
 * Service for storing and retrieving activities and activity groups.
 */
export class ActivityStorage {
  private rootPath: string;
  private activitiesPath: string;
  private groupsPath: string;
  private indexPath: string;
  
  /**
   * Creates a new ActivityStorage instance.
   * 
   * @param rootPath The root path of the project
   */
  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.activitiesPath = path.join(rootPath, '.warp_memory', 'activities');
    this.groupsPath = path.join(rootPath, '.warp_memory', 'activity_groups');
    this.indexPath = path.join(rootPath, '.warp_memory', 'activity_indexes');
    this.ensureDirectories();
  }
  
  /**
   * Ensures all required directories exist.
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.activitiesPath, { recursive: true });
      await fs.mkdir(this.groupsPath, { recursive: true });
      await fs.mkdir(this.indexPath, { recursive: true });
      await fs.mkdir(path.join(this.indexPath, 'task'), { recursive: true });
      await fs.mkdir(path.join(this.indexPath, 'entity'), { recursive: true });
      console.log('Activity storage directories created successfully');
    } catch (error) {
      console.error('Error creating activity storage directories:', error);
      throw error;
    }
  }
  
  /**
   * Stores an activity in the file system.
   * 
   * @param activity The activity to store
   * @returns The stored activity with generated ID if not provided
   */
  async storeActivity(activity: Activity): Promise<Activity> {
    const id = activity.id || `act-${uuidv4()}`;
    activity.id = id;
    activity.timestamp = activity.timestamp || new Date().toISOString();
    
    // Save activity file
    const activityPath = path.join(this.activitiesPath, `${id}.json`);
    await fs.writeFile(activityPath, JSON.stringify(activity, null, 2), 'utf-8');
    
    // Update task index if applicable
    if (activity.taskId) {
      await this.updateTaskIndex(activity.taskId, id);
    }
    
    // Update entity indexes if applicable
    if (activity.relatedEntityIds?.length) {
      for (const entityId of activity.relatedEntityIds) {
        await this.updateEntityIndex(entityId, id);
      }
    }
    
    console.log(`Stored activity: ${id}`);
    return activity;
  }
  
  /**
   * Retrieves an activity by ID.
   * 
   * @param id The activity ID
   * @returns The activity or null if not found
   */
  async getActivity(id: string): Promise<Activity | null> {
    try {
      const activityPath = path.join(this.activitiesPath, `${id}.json`);
      const data = await fs.readFile(activityPath, 'utf-8');
      return JSON.parse(data) as Activity;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Stores an activity group in the file system.
   * 
   * @param group The activity group to store
   * @returns The stored activity group with generated ID if not provided
   */
  async storeActivityGroup(group: ActivityGroup): Promise<ActivityGroup> {
    const id = group.id || `group-${uuidv4()}`;
    group.id = id;
    group.startTime = group.startTime || new Date().toISOString();
    
    // Save group file
    const groupPath = path.join(this.groupsPath, `${id}.json`);
    await fs.writeFile(groupPath, JSON.stringify(group, null, 2), 'utf-8');
    
    // Update task index if applicable
    if (group.taskId) {
      const taskGroupsPath = path.join(this.indexPath, 'task', `${group.taskId}_groups.json`);
      let groups: string[] = [];
      
      try {
        const existingData = await fs.readFile(taskGroupsPath, 'utf-8');
        groups = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist yet, that's OK
      }
      
      if (!groups.includes(id)) {
        groups.push(id);
        await fs.writeFile(taskGroupsPath, JSON.stringify(groups), 'utf-8');
      }
    }
    
    console.log(`Stored activity group: ${id}`);
    return group;
  }
  
  /**
   * Completes an activity group by setting its end time.
   * 
   * @param id The activity group ID
   * @returns The updated activity group or null if not found
   */
  async completeActivityGroup(id: string): Promise<ActivityGroup | null> {
    const group = await this.getActivityGroup(id);
    if (!group) return null;
    
    group.endTime = new Date().toISOString();
    await this.storeActivityGroup(group);
    return group;
  }
  
  /**
   * Retrieves an activity group by ID.
   * 
   * @param id The activity group ID
   * @returns The activity group or null if not found
   */
  async getActivityGroup(id: string): Promise<ActivityGroup | null> {
    try {
      const groupPath = path.join(this.groupsPath, `${id}.json`);
      const data = await fs.readFile(groupPath, 'utf-8');
      return JSON.parse(data) as ActivityGroup;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Updates the task index with an activity ID.
   * 
   * @param taskId The task ID
   * @param activityId The activity ID
   */
  private async updateTaskIndex(taskId: string, activityId: string): Promise<void> {
    const taskActivitiesPath = path.join(this.indexPath, 'task', `${taskId}.json`);
    let activities: string[] = [];
    
    try {
      const existingData = await fs.readFile(taskActivitiesPath, 'utf-8');
      activities = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet, that's OK
    }
    
    if (!activities.includes(activityId)) {
      activities.push(activityId);
      await fs.writeFile(taskActivitiesPath, JSON.stringify(activities), 'utf-8');
    }
  }
  
  /**
   * Updates the entity index with an activity ID.
   * 
   * @param entityId The entity ID (e.g., file path)
   * @param activityId The activity ID
   */
  private async updateEntityIndex(entityId: string, activityId: string): Promise<void> {
    // Normalize the entity ID to be a valid filename
    const normalizedEntityId = entityId.replace(/[\/\\:]/g, '_');
    const entityActivitiesPath = path.join(this.indexPath, 'entity', `${normalizedEntityId}.json`);
    let activities: string[] = [];
    
    try {
      const existingData = await fs.readFile(entityActivitiesPath, 'utf-8');
      activities = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet, that's OK
    }
    
    if (!activities.includes(activityId)) {
      activities.push(activityId);
      await fs.writeFile(entityActivitiesPath, JSON.stringify(activities), 'utf-8');
    }
  }
  
  /**
   * Gets all activities for a task.
   * 
   * @param taskId The task ID
   * @returns An array of activities
   */
  async getTaskActivities(taskId: string): Promise<Activity[]> {
    const taskActivitiesPath = path.join(this.indexPath, 'task', `${taskId}.json`);
    let activityIds: string[] = [];
    
    try {
      const existingData = await fs.readFile(taskActivitiesPath, 'utf-8');
      activityIds = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist, return empty array
      return [];
    }
    
    const activities: Activity[] = [];
    for (const id of activityIds) {
      const activity = await this.getActivity(id);
      if (activity) {
        activities.push(activity);
      }
    }
    
    // Sort by timestamp
    return activities.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
  
  /**
   * Gets all activities for an entity.
   * 
   * @param entityId The entity ID (e.g., file path)
   * @returns An array of activities
   */
  async getEntityActivities(entityId: string): Promise<Activity[]> {
    // Normalize the entity ID to be a valid filename
    const normalizedEntityId = entityId.replace(/[\/\\:]/g, '_');
    const entityActivitiesPath = path.join(this.indexPath, 'entity', `${normalizedEntityId}.json`);
    let activityIds: string[] = [];
    
    try {
      const existingData = await fs.readFile(entityActivitiesPath, 'utf-8');
      activityIds = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist, return empty array
      return [];
    }
    
    const activities: Activity[] = [];
    for (const id of activityIds) {
      const activity = await this.getActivity(id);
      if (activity) {
        activities.push(activity);
      }
    }
    
    // Sort by timestamp
    return activities.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
  
  /**
   * Gets all activity groups for a task.
   * 
   * @param taskId The task ID
   * @returns An array of activity group IDs
   */
  async getTaskActivityGroups(taskId: string): Promise<string[]> {
    const taskGroupsPath = path.join(this.indexPath, 'task', `${taskId}_groups.json`);
    
    try {
      const existingData = await fs.readFile(taskGroupsPath, 'utf-8');
      return JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist, return empty array
      return [];
    }
  }
}

/**
 * Types and interfaces for the CKG-based activity tracking system.
 * 
 * This file defines the TypeScript types and interfaces that correspond
 * to the GraphQL schema for activities and activity groups.
 */
import { z } from 'zod';

/**
 * Defines the type of actor that performed an activity.
 */
export enum ActorType {
  AGENT = 'AGENT',
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  INTEGRATION = 'INTEGRATION'
}

/**
 * Defines the type of activity being recorded.
 */
export enum ActivityType {
  // Communication activities
  COMMENT = 'COMMENT',
  QUESTION = 'QUESTION',
  ANSWER = 'ANSWER',
  
  // Task activities
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  
  // Code activities
  FILE_CREATED = 'FILE_CREATED',
  FILE_MODIFIED = 'FILE_MODIFIED',
  FILE_DELETED = 'FILE_DELETED',
  
  // Execution activities
  COMMAND_EXECUTED = 'COMMAND_EXECUTED',
  SCRIPT_RUN = 'SCRIPT_RUN',
  
  // Agent activities
  AGENT_TRANSITION = 'AGENT_TRANSITION',
  
  // Grouping activities
  GROUP_CREATED = 'GROUP_CREATED',
  GROUP_COMPLETED = 'GROUP_COMPLETED',
  
  // Other
  CUSTOM = 'CUSTOM'
}

/**
 * Defines how an activity should be rendered in the UI.
 */
export enum RenderMode {
  ALWAYS_EXPANDED = 'ALWAYS_EXPANDED',
  EXPANDABLE = 'EXPANDABLE',
  ALWAYS_CONDENSED = 'ALWAYS_CONDENSED'
}

/**
 * Defines the type of file change.
 */
export enum FileChangeType {
  CREATED = 'CREATED',
  MODIFIED = 'MODIFIED',
  DELETED = 'DELETED'
}

/**
 * Base activity interface with fields common to all activity types.
 */
export interface BaseActivity {
  id?: string; // Optional for creation
  timestamp?: string; // Optional for creation, defaults to current time
  taskId?: string;
  actorType: ActorType;
  actorId: string;
  activityType: ActivityType;
  title: string;
  content: string;
  renderMode: RenderMode;
  nestingLevel: number;
  metadata?: Record<string, any>;
  
  // Relationships
  parentActivityId?: string;
  activityGroupId?: string;
  relatedEntityIds?: string[];
}

/**
 * Complete Activity interface as stored in the CKG.
 */
export interface Activity extends BaseActivity {
  id: string; // Required after creation
  timestamp: string; // Required after creation
  createdAt: string;
  modifiedAt?: string;
}

/**
 * Activity group interface.
 */
export interface ActivityGroup {
  id?: string; // Optional for creation
  title: string;
  description?: string;
  startTime?: string; // Optional for creation, defaults to current time
  endTime?: string;
  
  // Relationships
  parentGroupId?: string;
  taskId?: string;
  
  // Additional data
  metadata?: Record<string, any>;
  
  // System fields
  createdAt?: string;
  modifiedAt?: string;
}

/**
 * File change activity interface.
 */
export interface FileChangeActivity extends BaseActivity {
  activityType: ActivityType.FILE_CREATED | ActivityType.FILE_MODIFIED | ActivityType.FILE_DELETED;
  filePath: string;
  changeType: FileChangeType;
  diffContent?: string;
}

/**
 * Comment activity interface.
 */
export interface CommentActivity extends BaseActivity {
  activityType: ActivityType.COMMENT | ActivityType.QUESTION | ActivityType.ANSWER;
  mentions?: string[];
  hasAttachments: boolean;
}

/**
 * Command execution activity interface.
 */
export interface CommandActivity extends BaseActivity {
  activityType: ActivityType.COMMAND_EXECUTED | ActivityType.SCRIPT_RUN;
  command: string;
  exitCode: number;
  output: string;
}

/**
 * Agent transition activity interface.
 */
export interface AgentTransitionActivity extends BaseActivity {
  activityType: ActivityType.AGENT_TRANSITION;
  fromRole: string;
  toRole: string;
  reason: string;
}

/**
 * Options for filtering and formatting activity timelines.
 */
export interface TimelineOptions {
  includeNested?: boolean;
  defaultExpanded?: boolean;
  groupByType?: boolean;
  filterTypes?: ActivityType[];
  filterActors?: ActorType[];
  startTime?: string;
  endTime?: string;
  limit?: number;
}

// Zod schemas for validation

export const baseActivitySchema = z.object({
  id: z.string().optional(),
  timestamp: z.string().optional(),
  taskId: z.string().optional(),
  actorType: z.nativeEnum(ActorType),
  actorId: z.string(),
  activityType: z.nativeEnum(ActivityType),
  title: z.string(),
  content: z.string(),
  renderMode: z.nativeEnum(RenderMode),
  nestingLevel: z.number().int().nonnegative(),
  metadata: z.record(z.any()).optional(),
  parentActivityId: z.string().optional(),
  activityGroupId: z.string().optional(),
  relatedEntityIds: z.array(z.string()).optional()
});

export const activitySchema = baseActivitySchema.extend({
  id: z.string(),
  timestamp: z.string(),
  createdAt: z.string(),
  modifiedAt: z.string().optional()
});

export const activityGroupSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  parentGroupId: z.string().optional(),
  taskId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional()
});

export const fileChangeActivitySchema = baseActivitySchema.extend({
  activityType: z.enum([
    ActivityType.FILE_CREATED,
    ActivityType.FILE_MODIFIED,
    ActivityType.FILE_DELETED
  ]),
  filePath: z.string(),
  changeType: z.nativeEnum(FileChangeType),
  diffContent: z.string().optional()
});

export const commentActivitySchema = baseActivitySchema.extend({
  activityType: z.enum([
    ActivityType.COMMENT,
    ActivityType.QUESTION,
    ActivityType.ANSWER
  ]),
  mentions: z.array(z.string()).optional(),
  hasAttachments: z.boolean()
});

export const commandActivitySchema = baseActivitySchema.extend({
  activityType: z.enum([
    ActivityType.COMMAND_EXECUTED,
    ActivityType.SCRIPT_RUN
  ]),
  command: z.string(),
  exitCode: z.number().int(),
  output: z.string()
});

export const agentTransitionActivitySchema = baseActivitySchema.extend({
  activityType: z.literal(ActivityType.AGENT_TRANSITION),
  fromRole: z.string(),
  toRole: z.string(),
  reason: z.string()
});

export const timelineOptionsSchema = z.object({
  includeNested: z.boolean().optional(),
  defaultExpanded: z.boolean().optional(),
  groupByType: z.boolean().optional(),
  filterTypes: z.array(z.nativeEnum(ActivityType)).optional(),
  filterActors: z.array(z.nativeEnum(ActorType)).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  limit: z.number().int().positive().optional()
});

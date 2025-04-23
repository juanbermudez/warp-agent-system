/**
 * Types and interfaces for the activity tracking system.
 * 
 * This file defines the schema for activities, activity groups, and
 * specialized activity types used throughout the Warp agent system.
 */

/**
 * Defines the type of actor that performed an activity.
 */
export enum ActorType {
  AGENT = 'AGENT',      // Activities performed by AI agents
  USER = 'USER',        // Activities performed by human users
  SYSTEM = 'SYSTEM',    // Activities performed by the system itself
  INTEGRATION = 'INTEGRATION' // Activities from integrations (GitHub, etc.)
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
  ALWAYS_EXPANDED = 'ALWAYS_EXPANDED',   // Always show full content
  EXPANDABLE = 'EXPANDABLE',             // Allow expanding/collapsing
  ALWAYS_CONDENSED = 'ALWAYS_CONDENSED'  // Always show condensed view
}

/**
 * The base Activity interface that defines common properties for all activities.
 */
export interface Activity {
  id: string;
  timestamp: string;
  taskId?: string;
  actorType: ActorType;
  actorId: string;
  activityType: ActivityType;
  
  // Display info
  title: string;
  content: string;
  renderMode: RenderMode;
  
  // Nesting structure
  parentActivityId?: string;
  activityGroupId?: string;
  nestingLevel: number;
  
  // Additional data
  metadata: Record<string, any>;
  status?: string;
  relatedEntityIds?: string[];
}

/**
 * Represents a logical grouping of related activities.
 */
export interface ActivityGroup {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  parentGroupId?: string;
  taskId?: string;
  metadata: Record<string, any>;
}

/**
 * Specialized activity type for file changes.
 */
export interface FileChangeActivity extends Activity {
  filePath: string;
  changeType: 'CREATED' | 'MODIFIED' | 'DELETED';
  diffContent?: string;
}

/**
 * Specialized activity type for comments.
 */
export interface CommentActivity extends Activity {
  mentions?: string[];
  hasAttachments: boolean;
}

/**
 * Specialized activity type for command executions.
 */
export interface CommandActivity extends Activity {
  command: string;
  exitCode: number;
  output: string;
}

/**
 * Specialized activity type for agent transitions.
 */
export interface AgentTransitionActivity extends Activity {
  fromRole: string;
  toRole: string;
  reason: string;
}

/**
 * Options for filtering and formatting activity timelines.
 */
export interface TimelineOptions {
  includeNested: boolean;
  defaultExpanded: boolean;
  groupByType: boolean;
  filterTypes?: ActivityType[];
  filterActors?: ActorType[];
}

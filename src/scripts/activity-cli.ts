#!/usr/bin/env node
/**
 * Activity Tracking CLI
 * 
 * Command-line interface for the activity tracking system.
 * Provides commands for logging various types of activities,
 * managing activity groups, and retrieving activities.
 */

import path from 'path';
import { ActivityTracker } from '../services/activity/activity-tracker';
import { ActorType, ActivityType, RenderMode } from '../services/activity/types';

// Get project root path
const ROOT_PATH = path.resolve(process.cwd());

// Parse command line arguments
const args = process.argv.slice(2);
let command = args[0] || 'help';

// Initialize activity tracker
const activityTracker = new ActivityTracker(ROOT_PATH);

/**
 * Main CLI entry point
 */
async function main() {
  try {
    // Execute command
    switch (command) {
      case 'log':
        await logActivity();
        break;
        
      case 'comment':
        await logComment();
        break;
        
      case 'file':
        await logFileChange();
        break;
        
      case 'command':
        await logCommandExecution();
        break;
        
      case 'transition':
        await logAgentTransition();
        break;
        
      case 'group':
        await handleGroupCommand();
        break;
        
      case 'list':
        await listActivities();
        break;
        
      case 'thread':
        await showThread();
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error executing command:', error);
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Helper to get argument value
 */
function getArgValue(args: string[], key: string): string | undefined {
  const index = args.findIndex(arg => arg === key);
  if (index !== -1 && index < args.length - 1) {
    return args[index + 1];
  }
  return undefined;
}

/**
 * Log a generic activity
 */
async function logActivity() {
  const title = getArgValue(args, '--title') || 'Untitled Activity';
  const content = getArgValue(args, '--content') || '';
  const type = getArgValue(args, '--type') || 'CUSTOM';
  const actorType = getArgValue(args, '--actor-type') || 'SYSTEM';
  const actorId = getArgValue(args, '--actor-id') || 'system';
  const taskId = getArgValue(args, '--task-id');
  const parentId = getArgValue(args, '--parent-id');
  const groupId = getArgValue(args, '--group-id');
  
  // Validate activity type
  if (!Object.values(ActivityType).includes(type as ActivityType)) {
    console.error(`Invalid activity type: ${type}`);
    console.error(`Valid types: ${Object.values(ActivityType).join(', ')}`);
    process.exit(1);
  }
  
  // Validate actor type
  if (!Object.values(ActorType).includes(actorType as ActorType)) {
    console.error(`Invalid actor type: ${actorType}`);
    console.error(`Valid types: ${Object.values(ActorType).join(', ')}`);
    process.exit(1);
  }
  
  const activity = await activityTracker.logActivity({
    title,
    content,
    activityType: type as ActivityType,
    actorType: actorType as ActorType,
    actorId,
    taskId,
    parentActivityId: parentId,
    activityGroupId: groupId,
    renderMode: RenderMode.EXPANDABLE,
  });
  
  console.log(`Activity logged: ${activity.id}`);
  console.log(JSON.stringify(activity, null, 2));
}

/**
 * Log a comment
 */
async function logComment() {
  const content = getArgValue(args, '--content');
  if (!content) {
    console.error('Comment content is required: --content "Your comment"');
    process.exit(1);
  }
  
  const actorType = getArgValue(args, '--actor-type') || 'USER';
  const actorId = getArgValue(args, '--actor-id') || 'user';
  const taskId = getArgValue(args, '--task-id');
  const parentId = getArgValue(args, '--parent-id');
  const groupId = getArgValue(args, '--group-id');
  
  const comment = await activityTracker.logComment({
    content,
    actorType: actorType as ActorType,
    actorId,
    taskId,
    parentActivityId: parentId,
    activityGroupId: groupId,
  });
  
  console.log(`Comment logged: ${comment.id}`);
  console.log(JSON.stringify(comment, null, 2));
}

/**
 * Log a file change
 */
async function logFileChange() {
  const filePath = getArgValue(args, '--file');
  if (!filePath) {
    console.error('File path is required: --file path/to/file.ts');
    process.exit(1);
  }
  
  const changeType = getArgValue(args, '--change-type') || 'MODIFIED';
  if (!['CREATED', 'MODIFIED', 'DELETED'].includes(changeType)) {
    console.error('Invalid change type. Use CREATED, MODIFIED, or DELETED');
    process.exit(1);
  }
  
  const diffContent = getArgValue(args, '--diff');
  const actorType = getArgValue(args, '--actor-type') || 'AGENT';
  const actorId = getArgValue(args, '--actor-id') || 'agent';
  const taskId = getArgValue(args, '--task-id');
  const groupId = getArgValue(args, '--group-id');
  
  const fileChange = await activityTracker.logFileChange({
    filePath,
    changeType: changeType as 'CREATED' | 'MODIFIED' | 'DELETED',
    diffContent,
    actorType: actorType as ActorType,
    actorId,
    taskId,
    activityGroupId: groupId,
  });
  
  console.log(`File change logged: ${fileChange.id}`);
  console.log(JSON.stringify(fileChange, null, 2));
}

/**
 * Log a command execution
 */
async function logCommandExecution() {
  const command = getArgValue(args, '--command');
  if (!command) {
    console.error('Command is required: --command "npm install"');
    process.exit(1);
  }
  
  const output = getArgValue(args, '--output') || '';
  const exitCode = parseInt(getArgValue(args, '--exit-code') || '0', 10);
  const actorType = getArgValue(args, '--actor-type') || 'AGENT';
  const actorId = getArgValue(args, '--actor-id') || 'agent';
  const taskId = getArgValue(args, '--task-id');
  const groupId = getArgValue(args, '--group-id');
  
  const commandActivity = await activityTracker.logCommand({
    command,
    output,
    exitCode,
    actorType: actorType as ActorType,
    actorId,
    taskId,
    activityGroupId: groupId,
  });
  
  console.log(`Command execution logged: ${commandActivity.id}`);
  console.log(JSON.stringify(commandActivity, null, 2));
}

/**
 * Log an agent transition
 */
async function logAgentTransition() {
  const fromRole = getArgValue(args, '--from');
  if (!fromRole) {
    console.error('From role is required: --from BACKEND_ENGINEER');
    process.exit(1);
  }
  
  const toRole = getArgValue(args, '--to');
  if (!toRole) {
    console.error('To role is required: --to QA_TESTER');
    process.exit(1);
  }
  
  const reason = getArgValue(args, '--reason') || 'Agent transition';
  const taskId = getArgValue(args, '--task-id');
  const groupId = getArgValue(args, '--group-id');
  
  const transition = await activityTracker.logAgentTransition({
    fromRole,
    toRole,
    reason,
    taskId,
    activityGroupId: groupId,
  });
  
  console.log(`Agent transition logged: ${transition.id}`);
  console.log(JSON.stringify(transition, null, 2));
}

/**
 * Handle activity group commands
 */
async function handleGroupCommand() {
  const subCommand = args[1] || 'create';
  
  switch (subCommand) {
    case 'create':
      await createActivityGroup();
      break;
      
    case 'complete':
      await completeActivityGroup();
      break;
      
    default:
      console.error(`Unknown group subcommand: ${subCommand}`);
      console.log('Available group subcommands: create, complete');
      process.exit(1);
  }
}

/**
 * Create a new activity group
 */
async function createActivityGroup() {
  const title = getArgValue(args, '--title');
  if (!title) {
    console.error('Group title is required: --title "Implement Feature X"');
    process.exit(1);
  }
  
  const description = getArgValue(args, '--description');
  const taskId = getArgValue(args, '--task-id');
  const parentGroupId = getArgValue(args, '--parent-id');
  
  const group = await activityTracker.createActivityGroup({
    title,
    description,
    taskId,
    parentGroupId,
  });
  
  console.log(`Activity group created: ${group.id}`);
  console.log(JSON.stringify(group, null, 2));
}

/**
 * Complete an activity group
 */
async function completeActivityGroup() {
  const groupId = getArgValue(args, '--id');
  if (!groupId) {
    console.error('Group ID is required: --id group-1234');
    process.exit(1);
  }
  
  const group = await activityTracker.completeActivityGroup(groupId);
  if (!group) {
    console.error(`Group not found: ${groupId}`);
    process.exit(1);
  }
  
  console.log(`Activity group completed: ${group.id}`);
  console.log(JSON.stringify(group, null, 2));
}

/**
 * List activities based on criteria
 */
async function listActivities() {
  const taskId = getArgValue(args, '--task-id');
  if (!taskId) {
    console.error('Task ID is required: --task-id task-1234');
    process.exit(1);
  }
  
  const includeNested = args.includes('--nested');
  const defaultExpanded = args.includes('--expanded');
  const groupByType = args.includes('--group-by-type');
  const filterTypes = getArgValue(args, '--filter-types')?.split(',') as ActivityType[] | undefined;
  const filterActors = getArgValue(args, '--filter-actors')?.split(',') as ActorType[] | undefined;
  
  const activities = await activityTracker.getTaskTimeline(taskId, {
    includeNested,
    defaultExpanded,
    groupByType,
    filterTypes,
    filterActors,
  });
  
  console.log(`Found ${activities.length} activities for task ${taskId}:`);
  
  // Format and display activities based on options
  if (activities.length === 0) {
    console.log('No activities found.');
    return;
  }
  
  if (args.includes('--json')) {
    // Output as JSON
    console.log(JSON.stringify(activities, null, 2));
    return;
  }
  
  // Format as a timeline
  activities.forEach(activity => {
    const timestamp = new Date(activity.timestamp).toLocaleString();
    const indent = '  '.repeat(activity.nestingLevel);
    const actorText = `[${activity.actorType}:${activity.actorId}]`;
    
    console.log(`${timestamp} ${indent}${actorText} ${activity.title}`);
    
    if (defaultExpanded && activity.renderMode !== RenderMode.ALWAYS_CONDENSED) {
      console.log(`${indent}  ${activity.content.split('\n').join('\n' + indent + '  ')}`);
    }
  });
}

/**
 * Show an activity thread
 */
async function showThread() {
  const activityId = getArgValue(args, '--id');
  if (!activityId) {
    console.error('Activity ID is required: --id act-1234');
    process.exit(1);
  }
  
  const thread = await activityTracker.getActivityThread(activityId);
  if (thread.length === 0) {
    console.error(`Activity not found or has no thread: ${activityId}`);
    process.exit(1);
  }
  
  console.log(`Thread for activity ${activityId}:`);
  
  // Format and display the thread
  if (args.includes('--json')) {
    console.log(JSON.stringify(thread, null, 2));
    return;
  }
  
  // Format as a conversation thread
  thread.forEach(activity => {
    const timestamp = new Date(activity.timestamp).toLocaleString();
    const indent = activity.id === activityId ? '' : '  ';
    const actorText = `[${activity.actorType}:${activity.actorId}]`;
    
    console.log(`${timestamp} ${indent}${actorText} ${activity.title}`);
    console.log(`${indent}${activity.content}`);
    console.log(''); // Empty line between comments
  });
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Warp Activity Tracking CLI

Usage: activity-cli COMMAND [OPTIONS]

Commands:
  log            Log a generic activity
                 Options: --title, --content, --type, --actor-type, --actor-id, --task-id, --parent-id, --group-id
  
  comment        Log a comment
                 Options: --content, --actor-type, --actor-id, --task-id, --parent-id, --group-id
  
  file           Log a file change
                 Options: --file, --change-type, --diff, --actor-type, --actor-id, --task-id, --group-id
  
  command        Log a command execution
                 Options: --command, --output, --exit-code, --actor-type, --actor-id, --task-id, --group-id
  
  transition     Log an agent transition
                 Options: --from, --to, --reason, --task-id, --group-id
  
  group          Manage activity groups
                 Subcommands: create, complete
                 Options: 
                   create: --title, --description, --task-id, --parent-id
                   complete: --id
  
  list           List activities for a task
                 Options: --task-id, --nested, --expanded, --group-by-type, --filter-types, --filter-actors, --json
  
  thread         Show an activity thread
                 Options: --id, --json
  
  help           Show this help message

Examples:
  activity-cli comment --content "This needs review" --task-id task-1234
  activity-cli file --file src/index.ts --change-type MODIFIED --task-id task-1234
  activity-cli group create --title "Implement Authentication" --task-id task-1234
  activity-cli list --task-id task-1234 --expanded
  `);
}

// Run main function
main();

#!/usr/bin/env node

/**
 * Activity CLI - CKG Implementation
 * 
 * Command-line interface for the activity tracking system.
 * Provides commands for logging and retrieving activities.
 */

import { program } from 'commander';
import chalk from 'chalk';
import { ActivityTrackerCKG } from '../services/activity/activity-tracker-ckg.js';
import { 
  ActorType, ActivityType, RenderMode, FileChangeType
} from '../services/activity/types-ckg.js';

// Create activity tracker instance
const activityTracker = new ActivityTrackerCKG();

// Setup CLI program
program
  .name('warp-activity')
  .description('Warp Activity Tracking System CLI')
  .version('1.0.0');

// Log a generic activity
program
  .command('log')
  .description('Log a generic activity')
  .requiredOption('-t, --title <title>', 'Activity title')
  .requiredOption('-c, --content <content>', 'Activity content')
  .option('-a, --actor-type <type>', 'Actor type (AGENT, USER, SYSTEM, INTEGRATION)', 'USER')
  .option('-i, --actor-id <id>', 'Actor ID', 'cli-user')
  .option('--activity-type <type>', 'Activity type', 'CUSTOM')
  .option('--task-id <id>', 'Related task ID')
  .option('--group-id <id>', 'Activity group ID')
  .option('--parent-id <id>', 'Parent activity ID')
  .option('--related-entities <ids>', 'Comma-separated list of related entity IDs')
  .action(async (options) => {
    try {
      const activity = await activityTracker.logActivity({
        title: options.title,
        content: options.content,
        actorType: options.actorType as ActorType,
        actorId: options.actorId,
        activityType: options.activityType as ActivityType,
        taskId: options.taskId,
        activityGroupId: options.groupId,
        parentActivityId: options.parentId,
        relatedEntityIds: options.relatedEntities?.split(',')
      });
      
      console.log(chalk.green('Activity logged successfully:'));
      console.log(chalk.cyan('ID:'), activity.id);
      console.log(chalk.cyan('Timestamp:'), activity.timestamp);
      console.log(chalk.cyan('Title:'), activity.title);
    } catch (error) {
      console.error(chalk.red('Error logging activity:'), error);
      process.exit(1);
    }
  });

// Log a comment
program
  .command('comment')
  .description('Log a comment activity')
  .requiredOption('-c, --content <content>', 'Comment content')
  .option('-a, --actor-type <type>', 'Actor type (AGENT, USER, SYSTEM, INTEGRATION)', 'USER')
  .option('-i, --actor-id <id>', 'Actor ID', 'cli-user')
  .option('--task-id <id>', 'Related task ID')
  .option('--group-id <id>', 'Activity group ID')
  .option('--parent-id <id>', 'Parent activity ID (for replies)')
  .option('--mentions <users>', 'Comma-separated list of mentioned users')
  .option('--has-attachments', 'Whether the comment has attachments', false)
  .action(async (options) => {
    try {
      const comment = await activityTracker.logComment({
        content: options.content,
        actorType: options.actorType as ActorType,
        actorId: options.actorId,
        taskId: options.taskId,
        activityGroupId: options.groupId,
        parentActivityId: options.parentId,
        mentions: options.mentions?.split(','),
        hasAttachments: options.hasAttachments
      });
      
      console.log(chalk.green('Comment logged successfully:'));
      console.log(chalk.cyan('ID:'), comment.id);
      console.log(chalk.cyan('Timestamp:'), comment.timestamp);
      console.log(chalk.cyan('Content:'), comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''));
    } catch (error) {
      console.error(chalk.red('Error logging comment:'), error);
      process.exit(1);
    }
  });

// Log a file change
program
  .command('file-change')
  .description('Log a file change activity')
  .requiredOption('-p, --path <path>', 'File path')
  .requiredOption('-t, --type <type>', 'Change type (CREATED, MODIFIED, DELETED)')
  .option('-a, --actor-type <type>', 'Actor type (AGENT, USER, SYSTEM, INTEGRATION)', 'USER')
  .option('-i, --actor-id <id>', 'Actor ID', 'cli-user')
  .option('-d, --diff <content>', 'Diff content')
  .option('--task-id <id>', 'Related task ID')
  .option('--group-id <id>', 'Activity group ID')
  .action(async (options) => {
    try {
      const fileChange = await activityTracker.logFileChange({
        filePath: options.path,
        changeType: options.type as 'CREATED' | 'MODIFIED' | 'DELETED',
        actorType: options.actorType as ActorType,
        actorId: options.actorId,
        taskId: options.taskId,
        activityGroupId: options.groupId,
        diffContent: options.diff
      });
      
      console.log(chalk.green('File change logged successfully:'));
      console.log(chalk.cyan('ID:'), fileChange.id);
      console.log(chalk.cyan('Timestamp:'), fileChange.timestamp);
      console.log(chalk.cyan('File:'), fileChange.filePath);
      console.log(chalk.cyan('Change type:'), fileChange.changeType);
    } catch (error) {
      console.error(chalk.red('Error logging file change:'), error);
      process.exit(1);
    }
  });

// Log a command execution
program
  .command('command')
  .description('Log a command execution activity')
  .requiredOption('-c, --command <command>', 'Command executed')
  .requiredOption('-o, --output <o>', 'Command output')
  .requiredOption('-e, --exit-code <code>', 'Exit code', '0')
  .option('-a, --actor-type <type>', 'Actor type (AGENT, USER, SYSTEM, INTEGRATION)', 'USER')
  .option('-i, --actor-id <id>', 'Actor ID', 'cli-user')
  .option('--task-id <id>', 'Related task ID')
  .option('--group-id <id>', 'Activity group ID')
  .action(async (options) => {
    try {
      const command = await activityTracker.logCommand({
        command: options.command,
        output: options.output,
        exitCode: parseInt(options.exitCode),
        actorType: options.actorType as ActorType,
        actorId: options.actorId,
        taskId: options.taskId,
        activityGroupId: options.groupId
      });
      
      console.log(chalk.green('Command execution logged successfully:'));
      console.log(chalk.cyan('ID:'), command.id);
      console.log(chalk.cyan('Timestamp:'), command.timestamp);
      console.log(chalk.cyan('Command:'), command.command);
      console.log(chalk.cyan('Exit code:'), command.exitCode);
    } catch (error) {
      console.error(chalk.red('Error logging command execution:'), error);
      process.exit(1);
    }
  });

// Log an agent transition
program
  .command('transition')
  .description('Log an agent transition activity')
  .requiredOption('-f, --from <role>', 'From role')
  .requiredOption('-t, --to <role>', 'To role')
  .requiredOption('-r, --reason <reason>', 'Transition reason')
  .requiredOption('-i, --agent-id <id>', 'Agent ID')
  .option('--task-id <id>', 'Related task ID')
  .option('--group-id <id>', 'Activity group ID')
  .action(async (options) => {
    try {
      const transition = await activityTracker.logAgentTransition({
        fromRole: options.from,
        toRole: options.to,
        reason: options.reason,
        actorId: options.agentId,
        taskId: options.taskId,
        activityGroupId: options.groupId
      });
      
      console.log(chalk.green('Agent transition logged successfully:'));
      console.log(chalk.cyan('ID:'), transition.id);
      console.log(chalk.cyan('Timestamp:'), transition.timestamp);
      console.log(chalk.cyan('From:'), transition.fromRole);
      console.log(chalk.cyan('To:'), transition.toRole);
      console.log(chalk.cyan('Reason:'), transition.reason);
    } catch (error) {
      console.error(chalk.red('Error logging agent transition:'), error);
      process.exit(1);
    }
  });

// Create an activity group
program
  .command('create-group')
  .description('Create a new activity group')
  .requiredOption('-t, --title <title>', 'Group title')
  .option('-d, --description <description>', 'Group description')
  .option('--task-id <id>', 'Related task ID')
  .option('--parent-id <id>', 'Parent group ID')
  .action(async (options) => {
    try {
      const group = await activityTracker.createActivityGroup({
        title: options.title,
        description: options.description,
        taskId: options.taskId,
        parentGroupId: options.parentId
      });
      
      console.log(chalk.green('Activity group created successfully:'));
      console.log(chalk.cyan('ID:'), group.id);
      console.log(chalk.cyan('Title:'), group.title);
      console.log(chalk.cyan('Start time:'), group.startTime);
    } catch (error) {
      console.error(chalk.red('Error creating activity group:'), error);
      process.exit(1);
    }
  });

// Complete an activity group
program
  .command('complete-group')
  .description('Complete an activity group')
  .requiredOption('-i, --id <id>', 'Group ID')
  .action(async (options) => {
    try {
      const group = await activityTracker.completeActivityGroup(options.id);
      
      if (!group) {
        console.error(chalk.red('Activity group not found:'), options.id);
        process.exit(1);
      }
      
      console.log(chalk.green('Activity group completed successfully:'));
      console.log(chalk.cyan('ID:'), group.id);
      console.log(chalk.cyan('Title:'), group.title);
      console.log(chalk.cyan('End time:'), group.endTime);
    } catch (error) {
      console.error(chalk.red('Error completing activity group:'), error);
      process.exit(1);
    }
  });

// Get an activity by ID
program
  .command('get')
  .description('Get an activity by ID')
  .requiredOption('-i, --id <id>', 'Activity ID')
  .action(async (options) => {
    try {
      const activity = await activityTracker.getActivity(options.id);
      
      if (!activity) {
        console.error(chalk.red('Activity not found:'), options.id);
        process.exit(1);
      }
      
      console.log(chalk.green('Activity:'));
      console.log(JSON.stringify(activity, null, 2));
    } catch (error) {
      console.error(chalk.red('Error getting activity:'), error);
      process.exit(1);
    }
  });

// Get task timeline
program
  .command('timeline')
  .description('Get task timeline')
  .requiredOption('-t, --task-id <id>', 'Task ID')
  .option('--include-nested', 'Include nested activities', true)
  .option('--filter-types <types>', 'Comma-separated list of activity types to include')
  .option('--filter-actors <actors>', 'Comma-separated list of actor types to include')
  .option('--start-time <time>', 'Filter by start time (ISO format)')
  .option('--end-time <time>', 'Filter by end time (ISO format)')
  .option('--limit <limit>', 'Maximum number of activities to return', '100')
  .action(async (options) => {
    try {
      const activities = await activityTracker.getTaskTimeline(
        options.taskId,
        {
          includeNested: options.includeNested === 'true',
          filterTypes: options.filterTypes?.split(',') as ActivityType[],
          filterActors: options.filterActors?.split(',') as ActorType[],
          startTime: options.startTime,
          endTime: options.endTime,
          limit: parseInt(options.limit)
        }
      );
      
      console.log(chalk.green(`Task timeline (${activities.length} activities):`));
      
      if (activities.length === 0) {
        console.log(chalk.yellow('No activities found'));
      } else {
        activities.forEach((activity, index) => {
          console.log(chalk.cyan(`\n[${index + 1}] ${activity.activityType} - ${activity.timestamp}`));
          console.log(chalk.bold(activity.title));
          console.log(activity.content.substring(0, 150) + (activity.content.length > 150 ? '...' : ''));
          console.log(chalk.gray(`Actor: ${activity.actorType}:${activity.actorId}, ID: ${activity.id}`));
        });
      }
    } catch (error) {
      console.error(chalk.red('Error getting task timeline:'), error);
      process.exit(1);
    }
  });

// Get file activities
program
  .command('file')
  .description('Get activities for a file')
  .requiredOption('-p, --path <path>', 'File path')
  .action(async (options) => {
    try {
      const activities = await activityTracker.getFileActivities(options.path);
      
      console.log(chalk.green(`File activities (${activities.length} activities):`));
      
      if (activities.length === 0) {
        console.log(chalk.yellow('No activities found'));
      } else {
        activities.forEach((activity, index) => {
          console.log(chalk.cyan(`\n[${index + 1}] ${activity.activityType} - ${activity.timestamp}`));
          console.log(chalk.bold(activity.title));
          console.log(activity.content.substring(0, 150) + (activity.content.length > 150 ? '...' : ''));
          console.log(chalk.gray(`Actor: ${activity.actorType}:${activity.actorId}, ID: ${activity.id}`));
        });
      }
    } catch (error) {
      console.error(chalk.red('Error getting file activities:'), error);
      process.exit(1);
    }
  });

// Get activity thread
program
  .command('thread')
  .description('Get an activity thread')
  .requiredOption('-i, --id <id>', 'Parent activity ID')
  .action(async (options) => {
    try {
      const activities = await activityTracker.getActivityThread(options.id);
      
      console.log(chalk.green(`Activity thread (${activities.length} activities):`));
      
      if (activities.length === 0) {
        console.log(chalk.yellow('No activities found'));
      } else {
        activities.forEach((activity, index) => {
          const indent = activity.nestingLevel > 0 ? '  '.repeat(activity.nestingLevel) : '';
          console.log(chalk.cyan(`\n${indent}[${index + 1}] ${activity.activityType} - ${activity.timestamp}`));
          console.log(`${indent}${chalk.bold(activity.title)}`);
          console.log(`${indent}${activity.content.substring(0, 150) + (activity.content.length > 150 ? '...' : '')}`);
          console.log(`${indent}${chalk.gray(`Actor: ${activity.actorType}:${activity.actorId}, ID: ${activity.id}`)}`);
        });
      }
    } catch (error) {
      console.error(chalk.red('Error getting activity thread:'), error);
      process.exit(1);
    }
  });

// Get time-based activities
program
  .command('time')
  .description('Get activities by time range')
  .requiredOption('--start-time <time>', 'Start time (ISO format)')
  .requiredOption('--end-time <time>', 'End time (ISO format)')
  .option('--filter-types <types>', 'Comma-separated list of activity types to include')
  .option('--filter-actors <actors>', 'Comma-separated list of actor types to include')
  .option('--limit <limit>', 'Maximum number of activities to return', '100')
  .action(async (options) => {
    try {
      const activities = await activityTracker.getTimeBasedActivities({
        startTime: options.startTime,
        endTime: options.endTime,
        activityTypes: options.filterTypes?.split(',') as ActivityType[],
        actorTypes: options.filterActors?.split(',') as ActorType[],
        limit: parseInt(options.limit)
      });
      
      console.log(chalk.green(`Time-based activities (${activities.length} activities):`));
      
      if (activities.length === 0) {
        console.log(chalk.yellow('No activities found'));
      } else {
        activities.forEach((activity, index) => {
          console.log(chalk.cyan(`\n[${index + 1}] ${activity.activityType} - ${activity.timestamp}`));
          console.log(chalk.bold(activity.title));
          console.log(activity.content.substring(0, 150) + (activity.content.length > 150 ? '...' : ''));
          console.log(chalk.gray(`Actor: ${activity.actorType}:${activity.actorId}, ID: ${activity.id}`));
        });
      }
    } catch (error) {
      console.error(chalk.red('Error getting time-based activities:'), error);
      process.exit(1);
    }
  });

// Parse arguments and execute
program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.help();
}
/**
 * Simplified types for the activity tracker testing
 */

// Enums
export const ActorType = {
  AGENT: 'AGENT',
  USER: 'USER',
  SYSTEM: 'SYSTEM',
  INTEGRATION: 'INTEGRATION'
};

export const ActivityType = {
  COMMENT: 'COMMENT',
  TASK_CREATED: 'TASK_CREATED',
  FILE_MODIFIED: 'FILE_MODIFIED',
  COMMAND_EXECUTED: 'COMMAND_EXECUTED',
  CUSTOM: 'CUSTOM'
};

export const RenderMode = {
  ALWAYS_EXPANDED: 'ALWAYS_EXPANDED',
  EXPANDABLE: 'EXPANDABLE',
  ALWAYS_CONDENSED: 'ALWAYS_CONDENSED'
};

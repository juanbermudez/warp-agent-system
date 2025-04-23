// src/tools/index.ts
// Export all tool handlers for MCP server registration

// CKG interaction tools
export { queryCkg } from './query-ckg.js';
export { updateCkg } from './update-ckg.js';
export { initializeSchemaHandler } from './initialize-schema.js';
export { analyzeTaskDependencies } from './analyze-task-dependencies.js';

// Define and export the tool handlers with standardized naming
export const queryCkgTool = {
  name: 'query-ckg',
  description: 'Query the Code Knowledge Graph',
  parameters: {
    queryType: 'string',
    parameters: 'object',
    requiredProperties: 'array?',
    cacheOptions: 'object?'
  },
  handler: queryCkg,
};

export const updateCkgTool = {
  name: 'update-ckg',
  description: 'Update the Code Knowledge Graph',
  parameters: {
    updateType: 'string',
    parameters: 'object'
  },
  handler: updateCkg,
};

export const analyzeTaskDependenciesTool = {
  name: 'analyze-task-dependencies',
  description: 'Analyze task dependencies and create execution plan',
  parameters: {
    parent_task_id: 'string'
  },
  handler: analyzeTaskDependencies,
};

// Additional tools will be exported as they are implemented
// For example:
// export { executeShellCommandTool } from './execute-shell-command.js';
// export { triggerHitlAlertTool } from './trigger-hitl-alert.js';
// export { analyzeTaskDependenciesTool } from './analyze-task-dependencies.js';

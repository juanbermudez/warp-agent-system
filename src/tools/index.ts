// src/tools/index.ts
// Export all tool handlers for MCP server registration

// CKG interaction tools
export { queryCkg } from './query-ckg.js';
export { updateCkg } from './update-ckg.js';
export { initializeSchemaHandler } from './initialize-schema.js';

// Define and export the tool handlers with standardized naming
export const queryCkgTool = {
  name: 'query-ckg',
  description: 'Query the Code Knowledge Graph',
  parameters: {}, // This should be updated with the proper schema
  handler: queryCkg,
};

export const updateCkgTool = {
  name: 'update-ckg',
  description: 'Update the Code Knowledge Graph',
  parameters: {}, // This should be updated with the proper schema
  handler: updateCkg,
};

// Additional tools will be exported as they are implemented
// For example:
// export { executeShellCommandTool } from './execute_shell_command';
// export { triggerHitlAlertTool } from './trigger_hitl_alert';
// export { analyzeTaskDependenciesTool } from './analyze_task_dependencies';

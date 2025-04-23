// src/tools/index.ts
// Export all tool handlers for MCP server registration

// Import and export tools directly
export { queryCkg } from './query-ckg.js';
export { updateCkg } from './update-ckg.js';
export { initializeSchema, initializeSchemaHandler } from './initialize-schema.js';
export { analyzeTaskDependencies } from './analyze-task-dependencies.js';

// Export tool handlers using a factory pattern to avoid circular references
export function getToolHandlers() {
  return {
    queryCkgTool: {
      name: 'query-ckg',
      description: 'Query the Code Knowledge Graph',
      parameters: {
        queryType: 'string',
        parameters: 'object',
        requiredProperties: 'array?',
        cacheOptions: 'object?'
      },
      // We use dynamic import to avoid circular reference
      handler: async (...args) => {
        const { queryCkg } = await import('./query-ckg.js');
        return queryCkg(...args);
      }
    },
    
    updateCkgTool: {
      name: 'update-ckg',
      description: 'Update the Code Knowledge Graph',
      parameters: {
        updateType: 'string',
        parameters: 'object'
      },
      handler: async (...args) => {
        const { updateCkg } = await import('./update-ckg.js');
        return updateCkg(...args);
      }
    },
    
    analyzeTaskDependenciesTool: {
      name: 'analyze-task-dependencies',
      description: 'Analyze task dependencies and create execution plan',
      parameters: {
        parent_task_id: 'string'
      },
      handler: async (...args) => {
        const { analyzeTaskDependencies } = await import('./analyze-task-dependencies.js');
        return analyzeTaskDependencies(...args);
      }
    },
  };
}

// Additional tools will be exported as they are implemented
// For example:
// export { executeShellCommandTool } from './execute-shell-command.js';
// export { triggerHitlAlertTool } from './trigger-hitl-alert.js';
// export { analyzeTaskDependenciesTool } from './analyze-task-dependencies.js';

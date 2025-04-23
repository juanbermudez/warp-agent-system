// Test ESM configuration
// This script tests importing both from the package and directly from files

// Import from the package exports
import { queryCkg, updateCkg, analyzeTaskDependencies, getToolHandlers } from './dist/tools/index.js';

console.log('ESM configuration test - Imports successful');
console.log('Direct imports:', {
  queryCkg: typeof queryCkg,
  updateCkg: typeof updateCkg,
  analyzeTaskDependencies: typeof analyzeTaskDependencies,
  getToolHandlers: typeof getToolHandlers
});

// Test dynamic import (ESM feature)
const testDynamicImport = async () => {
  try {
    // Get tool handlers
    const toolHandlers = getToolHandlers();
    console.log('Tool handlers:', Object.keys(toolHandlers));
    
    // Dynamically import a module
    const module = await import('./dist/tools/initialize-schema.js');
    console.log('Dynamic import successful:', {
      initializeSchema: typeof module.initializeSchema,
      initializeSchemaHandler: typeof module.initializeSchemaHandler
    });
  } catch (error) {
    console.error('Dynamic import failed:', error);
  }
};

testDynamicImport();

// Test imports after standardization using compiled files
import { queryCkg } from './dist/tools/query-ckg.js';
import { updateCkg } from './dist/tools/update-ckg.js';
import { initializeSchema } from './dist/tools/initialize-schema.js';
import { analyzeTaskDependencies } from './dist/tools/analyze-task-dependencies.js';

console.log('Import check completed - no syntax errors');
console.log('Functions imported successfully:', { 
  queryCkg: typeof queryCkg, 
  updateCkg: typeof updateCkg, 
  initializeSchema: typeof initializeSchema,
  analyzeTaskDependencies: typeof analyzeTaskDependencies
});

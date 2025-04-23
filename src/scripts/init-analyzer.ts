/**
 * Initialization script for the Project Analyzer module
 * 
 * Usage: 
 *   npm run analyzer:init -- --project=/path/to/project
 */

import { CKGConstructionService, initializeParsers } from '../services/ckg/builder';
import { logger } from '../utils/logger';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
let projectPath = '.'; // Default to current directory

// Simple argument parsing
for (const arg of args) {
  if (arg.startsWith('--project=')) {
    projectPath = arg.replace('--project=', '');
  }
}

// Resolve to absolute path
projectPath = path.resolve(projectPath);

async function main() {
  try {
    logger.info(`Initializing Tree-sitter parsers...`);
    await initializeParsers();
    
    logger.info(`Creating CKG Construction Service...`);
    const analyzer = new CKGConstructionService({
      // Customize config here if needed
      // dgraphEndpoint: 'localhost:9080',
      // openRouterApiKey: process.env.OPENROUTER_API_KEY
    });
    
    logger.info(`Starting analysis of project: ${projectPath}`);
    await analyzer.buildCKG(projectPath);
    
    logger.info('Analysis completed successfully.');
  } catch (error) {
    logger.error('Error during analysis:', error);
    process.exit(1);
  }
}

main();

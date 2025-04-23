#!/usr/bin/env node

/**
 * Script to copy schema files from src to dist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcSchemaDir = path.join(__dirname, 'src/db/schema');
const distSchemaDir = path.join(__dirname, 'dist/db/schema');

// Ensure the dist directory exists
fs.mkdirSync(distSchemaDir, { recursive: true });

// Find all GraphQL schema files
const schemaFiles = fs.readdirSync(srcSchemaDir).filter(file => 
  file.endsWith('.graphql') || file.endsWith('.txt')
);

// Copy each schema file
for (const file of schemaFiles) {
  const srcPath = path.join(srcSchemaDir, file);
  const distPath = path.join(distSchemaDir, file);
  
  fs.copyFileSync(srcPath, distPath);
  console.log(`Copied ${file} to dist directory`);
}

console.log('Done copying schema files!');

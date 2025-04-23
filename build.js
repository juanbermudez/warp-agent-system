#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Compile TypeScript
console.log('Compiling TypeScript...');
exec('tsc', (error, stdout, stderr) => {
  if (error) {
    console.error(`TypeScript compilation error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`TypeScript stderr: ${stderr}`);
  }
  
  console.log('TypeScript compilation complete.');
  
  // Copy schema files and other assets
  copyNonTsAssets();
});

function copyNonTsAssets() {
  console.log('Copying schema files and other assets...');
  
  // Copy schema.graphql files
  const sourceDir = path.join(__dirname, 'src');
  const destDir = path.join(__dirname, 'dist');
  
  // Find and copy all .graphql files
  copyFilesWithExtension(sourceDir, destDir, '.graphql');
  
  console.log('Build process complete!');
}

function copyFilesWithExtension(sourceDir, destDir, extension) {
  const items = fs.readdirSync(sourceDir, { withFileTypes: true });
  
  for (const item of items) {
    const sourcePath = path.join(sourceDir, item.name);
    const destPath = path.join(destDir, item.name);
    
    if (item.isDirectory()) {
      // Create directory if it doesn't exist
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      
      // Recurse into subdirectories
      copyFilesWithExtension(sourcePath, destPath, extension);
    } 
    else if (item.name.endsWith(extension)) {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${sourcePath} to ${destPath}`);
    }
  }
}

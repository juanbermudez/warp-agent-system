#!/usr/bin/env node

/**
 * Script to fix ES module imports in compiled JavaScript files
 * Adds .js extension to relative imports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');

// Regular expression to match relative imports without extensions
const importRegex = /import\s+.*\s+from\s+['"](\.[^'"]*)['"]/g;
const dynamicImportRegex = /import\(['"](\.[^'"]*)['"]\)/g;

// Function to recursively process a directory
async function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.name.endsWith('.js')) {
      await fixImportsInFile(fullPath);
    }
  }
}

// Function to fix imports in a single file
async function fixImportsInFile(filePath) {
  console.log(`Processing ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix static imports
  content = content.replace(importRegex, (match, importPath) => {
    // Only add .js if there's no extension already
    if (!path.extname(importPath)) {
      modified = true;
      return match.replace(importPath, `${importPath}.js`);
    }
    return match;
  });
  
  // Fix dynamic imports
  content = content.replace(dynamicImportRegex, (match, importPath) => {
    // Only add .js if there's no extension already
    if (!path.extname(importPath)) {
      modified = true;
      return match.replace(importPath, `${importPath}.js`);
    }
    return match;
  });
  
  // Fix __dirname and require usage
  if (content.includes('__dirname') || content.includes('require.main === module')) {
    content = content.replace(
      /const\s+(\w+)\s*=\s*path\.join\(\s*__dirname\s*,\s*(['"].*['"])\s*\)/g,
      (match, varName, pathStr) => {
        modified = true;
        return `const modulePath = new URL(import.meta.url).pathname;\n` +
               `const moduleDir = path.dirname(modulePath);\n` +
               `const ${varName} = path.join(moduleDir, ${pathStr})`;
      }
    );
    
    content = content.replace(
      /if\s*\(\s*require\.main\s*===\s*module\s*\)\s*{/g,
      match => {
        modified = true;
        return `const isMainModule = import.meta.url.startsWith('file:') && \n` +
               `    import.meta.url.slice(7) === process.argv[1];\n` +
               `if (isMainModule) {`;
      }
    );
    
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in ${filePath}`);
  }
}

// Main function
async function main() {
  console.log('Fixing ES module imports in dist directory...');
  await processDirectory(distDir);
  console.log('Done fixing imports!');
}

main().catch(console.error);

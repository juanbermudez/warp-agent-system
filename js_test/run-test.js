#!/usr/bin/env node

/**
 * Test runner for the simplified activity tracker
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('==== Running JavaScript Activity Tracker Test ====');

// Run the test
const test = spawn('node', ['tests/activity-simplified-test.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

test.on('close', (code) => {
  console.log(`==== Test complete with code: ${code} ====`);
});

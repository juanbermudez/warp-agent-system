#!/usr/bin/env node

/**
 * Runner for the agent activity integration test
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('==== Running Agent Activity Integration Test ====');

// Run the test
const test = spawn('node', ['tests/agent-activity-fixed-test.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

test.on('close', (code) => {
  console.log(`==== Test complete with code: ${code} ====`);
});

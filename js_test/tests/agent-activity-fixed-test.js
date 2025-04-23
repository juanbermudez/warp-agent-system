#!/usr/bin/env node

/**
 * Agent Activity Integration Fixed Test
 */

import { agentActivityExample } from '../services/agent/agent-activity-integration-fixed.js';

console.log('==== Starting Agent Activity Integration Test ====');

// Run the agent activity example
agentActivityExample().then(() => {
  console.log('==== Agent Activity Integration Test Complete ====');
}).catch(error => {
  console.error('Error in agent activity test:', error);
  process.exit(1);
});

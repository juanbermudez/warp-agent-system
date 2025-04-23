/**
 * Warp Agent System CLI
 * 
 * Command-line interface for interacting with the Warp agent system
 */

import path from 'path';
import fs from 'fs/promises';
import { AgentSystem } from '../services/agents/agent-system';
import { AgentRole } from '../services/agents/session-manager';
import { logger } from '../utils/logger';

// Get project root path
const ROOT_PATH = path.resolve(process.cwd());

// Parse command line arguments
const args = process.argv.slice(2);
let command = args[0] || 'help';

// Initialize agent system
const agentSystem = new AgentSystem(ROOT_PATH);

/**
 * Main CLI entry point
 */
async function main() {
  try {
    // Initialize the agent system
    await agentSystem.initialize();
    
    // Execute command
    switch (command) {
      case 'start':
        await startSession();
        break;
        
      case 'generate':
        await generateInstructions();
        break;
        
      case 'transition':
        await transitionAgent();
        break;
        
      case 'task':
        await handleTaskCommand();
        break;
        
      case 'list':
        await listResources();
        break;
        
      case 'hitl':
        await setHitlState();
        break;
        
      case 'end':
        await endSession();
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    logger.error('Error executing command:', error);
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Start a new agent session
 */
async function startSession() {
  // Parse arguments
  const roleArg = getArgValue(args, '--role') || 'ORCHESTRATOR';
  const taskId = getArgValue(args, '--task');
  
  // Validate role
  if (!Object.values(AgentRole).includes(roleArg as AgentRole)) {
    console.error(`Invalid role: ${roleArg}. Valid roles: ${Object.values(AgentRole).join(', ')}`);
    process.exit(1);
  }
  
  // Start session
  const session = await agentSystem.startSession(roleArg as AgentRole, taskId);
  console.log(`Session started: ${session.sessionId}`);
  console.log(`Initial role: ${session.activeRole}`);
  
  // Generate instructions if --generate flag is present
  if (args.includes('--generate')) {
    await generateInstructions();
  }
}

/**
 * Generate Claude instructions
 */
async function generateInstructions() {
  const outputPath = getArgValue(args, '--output');
  
  // Get active session
  const session = agentSystem.getActiveSession();
  if (!session) {
    console.error('No active session. Start a session first with: agent-cli start --role ROLE');
    process.exit(1);
  }
  
  // Generate instructions
  const instructions = await agentSystem.generateClaudeInstructions();
  
  // Output instructions
  if (outputPath) {
    // Write to file
    await fs.writeFile(outputPath, instructions, 'utf-8');
    console.log(`Instructions written to: ${outputPath}`);
  } else {
    // Print to console
    console.log('\n========== CLAUDE INSTRUCTIONS ==========\n');
    console.log(instructions);
    console.log('\n=========================================\n');
  }
}

/**
 * Transition to a different agent role
 */
async function transitionAgent() {
  // Parse arguments
  const roleArg = getArgValue(args, '--role');
  const notes = getArgValue(args, '--notes');
  
  if (!roleArg) {
    console.error('Role is required: --role ROLE');
    process.exit(1);
  }
  
  // Validate role
  if (!Object.values(AgentRole).includes(roleArg as AgentRole)) {
    console.error(`Invalid role: ${roleArg}. Valid roles: ${Object.values(AgentRole).join(', ')}`);
    process.exit(1);
  }
  
  // Get active session
  const session = agentSystem.getActiveSession();
  if (!session) {
    console.error('No active session. Start a session first with: agent-cli start --role ROLE');
    process.exit(1);
  }
  
  // Transition to new role
  const updatedSession = await agentSystem.transitionTo(roleArg as AgentRole, notes);
  console.log(`Transitioned from ${session.activeRole} to ${updatedSession.activeRole}`);
  
  // Generate instructions if --generate flag is present
  if (args.includes('--generate')) {
    await generateInstructions();
  }
}

/**
 * Handle task-related commands
 */
async function handleTaskCommand() {
  const subCommand = args[1] || 'list';
  
  switch (subCommand) {
    case 'create':
      await createTask();
      break;
      
    case 'update':
      await updateTask();
      break;
      
    case 'assign':
      await assignTask();
      break;
      
    case 'list':
      await listTasks();
      break;
      
    case 'get':
      await getTask();
      break;
      
    default:
      console.error(`Unknown task command: ${subCommand}`);
      console.log('Available task commands: create, update, assign, list, get');
      process.exit(1);
  }
}

/**
 * Create a new task
 */
async function createTask() {
  const title = getArgValue(args, '--title') || 'Untitled Task';
  const description = getArgValue(args, '--description') || '';
  const type = getArgValue(args, '--type') || 'TASK';
  
  const task = await agentSystem.createTask(title, description, type);
  console.log(`Task created: ${task.id}`);
  console.log(JSON.stringify(task, null, 2));
}

/**
 * Update a task's status
 */
async function updateTask() {
  const taskId = getArgValue(args, '--id');
  const status = getArgValue(args, '--status');
  
  if (!taskId) {
    console.error('Task ID is required: --id TASK_ID');
    process.exit(1);
  }
  
  if (!status) {
    console.error('Status is required: --status STATUS');
    process.exit(1);
  }
  
  const task = await agentSystem.updateTaskStatus(taskId, status);
  console.log(`Task ${taskId} updated to status: ${status}`);
  console.log(JSON.stringify(task, null, 2));
}

/**
 * Assign a task to an agent role
 */
async function assignTask() {
  const taskId = getArgValue(args, '--id');
  const roleArg = getArgValue(args, '--role');
  
  if (!taskId) {
    console.error('Task ID is required: --id TASK_ID');
    process.exit(1);
  }
  
  if (!roleArg) {
    console.error('Role is required: --role ROLE');
    process.exit(1);
  }
  
  // Validate role
  if (!Object.values(AgentRole).includes(roleArg as AgentRole)) {
    console.error(`Invalid role: ${roleArg}. Valid roles: ${Object.values(AgentRole).join(', ')}`);
    process.exit(1);
  }
  
  const task = await agentSystem.assignTask(taskId, roleArg as AgentRole);
  console.log(`Task ${taskId} assigned to role: ${roleArg}`);
  console.log(JSON.stringify(task, null, 2));
}

/**
 * List all tasks
 */
async function listTasks() {
  const tasks = await agentSystem.listTasks();
  console.log(`Found ${tasks.length} tasks:`);
  
  tasks.forEach(task => {
    console.log(`- ${task.id}: ${task.title} (${task.status})`);
  });
}

/**
 * Get a specific task
 */
async function getTask() {
  const taskId = getArgValue(args, '--id');
  
  if (!taskId) {
    console.error('Task ID is required: --id TASK_ID');
    process.exit(1);
  }
  
  const task = await agentSystem.getTask(taskId);
  if (!task) {
    console.error(`Task not found: ${taskId}`);
    process.exit(1);
  }
  
  console.log(JSON.stringify(task, null, 2));
}

/**
 * List available resources
 */
async function listResources() {
  const resourceType = args[1] || 'all';
  
  switch (resourceType) {
    case 'sessions':
      const sessions = await agentSystem.listSessions();
      console.log(`Found ${sessions.length} sessions:`);
      sessions.forEach(session => {
        console.log(`- ${session}`);
      });
      break;
      
    case 'tasks':
      await listTasks();
      break;
      
    case 'active':
      const activeSession = agentSystem.getActiveSession();
      if (activeSession) {
        console.log('Active session:');
        console.log(JSON.stringify(activeSession, null, 2));
      } else {
        console.log('No active session.');
      }
      break;
      
    case 'all':
    default:
      console.log('=== Active Session ===');
      const active = agentSystem.getActiveSession();
      if (active) {
        console.log(JSON.stringify(active, null, 2));
      } else {
        console.log('No active session.');
      }
      
      console.log('\n=== Sessions ===');
      const sessionList = await agentSystem.listSessions();
      console.log(`Found ${sessionList.length} sessions:`);
      sessionList.forEach(session => {
        console.log(`- ${session}`);
      });
      
      console.log('\n=== Tasks ===');
      const taskList = await agentSystem.listTasks();
      console.log(`Found ${taskList.length} tasks:`);
      taskList.forEach(task => {
        console.log(`- ${task.id}: ${task.title} (${task.status})`);
      });
      break;
  }
}

/**
 * Set HITL state in the current session
 */
async function setHitlState() {
  const state = getArgValue(args, '--state');
  
  if (!state) {
    console.error('HITL state is required: --state STATE');
    process.exit(1);
  }
  
  // Get active session
  const session = agentSystem.getActiveSession();
  if (!session) {
    console.error('No active session. Start a session first with: agent-cli start --role ROLE');
    process.exit(1);
  }
  
  // Set HITL state
  const updatedSession = await agentSystem.setHitlState(state);
  console.log(`HITL state set in session ${updatedSession.sessionId}`);
  
  // Generate instructions if --generate flag is present
  if (args.includes('--generate')) {
    await generateInstructions();
  }
}

/**
 * End the current session
 */
async function endSession() {
  const success = await agentSystem.endSession();
  if (success) {
    console.log('Session ended successfully.');
  } else {
    console.error('No active session to end.');
    process.exit(1);
  }
}

/**
 * Show CLI help
 */
function showHelp() {
  console.log(`
Warp Agent System CLI

Usage: agent-cli COMMAND [OPTIONS]

Commands:
  start         Start a new agent session
                Options: --role ROLE, --task TASK_ID, --generate
  
  generate      Generate Claude instructions for the current session
                Options: --output OUTPUT_FILE
  
  transition    Transition to a different agent role
                Options: --role ROLE, --notes NOTES, --generate
  
  task          Manage tasks
                Subcommands: create, update, assign, list, get
                Options:
                  create: --title TITLE, --description DESC, --type TYPE
                  update: --id TASK_ID, --status STATUS
                  assign: --id TASK_ID, --role ROLE
                  get: --id TASK_ID
  
  list          List resources
                Subcommands: sessions, tasks, active, all
  
  hitl          Set HITL state in the current session
                Options: --state STATE, --generate
  
  end           End the current session
  
  help          Show this help message

Examples:
  agent-cli start --role ORCHESTRATOR
  agent-cli generate --output instructions.md
  agent-cli transition --role BACKEND_ENGINEER --notes "Implementing auth module"
  agent-cli task create --title "Build Auth API" --type FEATURE
  agent-cli task update --id task-123 --status IN_PROGRESS
  agent-cli list tasks
  `);
}

/**
 * Get value for a command-line argument
 * @param args Array of command-line arguments
 * @param key Argument key to find
 * @returns Argument value or undefined if not found
 */
function getArgValue(args: string[], key: string): string | undefined {
  const index = args.findIndex(arg => arg === key);
  if (index !== -1 && index < args.length - 1) {
    return args[index + 1];
  }
  return undefined;
}

// Run main function
main();

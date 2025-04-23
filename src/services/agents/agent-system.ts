/**
 * Agent System for Warp
 * 
 * Central interface for managing the simulated multi-agent system
 */

import path from 'path';
import { logger } from '../../utils/logger';
import AgentSessionManager, { AgentRole, SessionState } from './session-manager';
import BlueprintLoader, { Blueprint } from './blueprint-loader';
import fs from 'fs/promises';

/**
 * Task definition
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  assignedRole?: AgentRole;
}

/**
 * Central management system for the Warp agent architecture
 */
export class AgentSystem {
  private rootPath: string;
  private sessionManager: AgentSessionManager;
  private blueprintLoader: BlueprintLoader;
  private memoryPath: string;
  
  /**
   * Constructor
   * @param rootPath Project root path
   */
  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.sessionManager = new AgentSessionManager(rootPath);
    this.blueprintLoader = new BlueprintLoader(rootPath);
    this.memoryPath = path.join(rootPath, '.warp_memory');
  }
  
  /**
   * Initialize the agent system
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Warp Agent System...');
    
    try {
      // Ensure memory directory exists
      await fs.mkdir(this.memoryPath, { recursive: true });
      
      // Create agent memory directories if they don't exist
      for (const role of Object.values(AgentRole)) {
        const rolePath = path.join(this.memoryPath, 'agents', role.toLowerCase());
        await fs.mkdir(rolePath, { recursive: true });
        
        // Create active_context.md file if it doesn't exist
        const contextPath = path.join(rolePath, 'active_context.md');
        try {
          await fs.access(contextPath);
        } catch {
          await fs.writeFile(contextPath, `# ${role} Active Context\n\nInitialized: ${new Date().toISOString()}\n`, 'utf-8');
        }
      }
      
      logger.info('Agent System initialized successfully.');
    } catch (error) {
      logger.error('Error initializing Agent System:', error);
      throw error;
    }
  }
  
  /**
   * Create a new task
   * @param title Task title
   * @param description Task description
   * @param type Task type
   * @returns Created task
   */
  async createTask(title: string, description: string, type: string): Promise<Task> {
    const taskId = `task-${Date.now()}`;
    const task: Task = {
      id: taskId,
      title,
      description,
      type,
      status: 'CREATED'
    };
    
    // Save task to file
    const tasksPath = path.join(this.memoryPath, 'tasks');
    await fs.mkdir(tasksPath, { recursive: true });
    await fs.writeFile(
      path.join(tasksPath, `${taskId}.json`),
      JSON.stringify(task, null, 2),
      'utf-8'
    );
    
    logger.info(`Created task: ${taskId}`);
    return task;
  }
  
  /**
   * Start a session with the initial agent role
   * @param initialRole Initial agent role
   * @param taskId Optional task ID
   * @returns Created session state
   */
  async startSession(initialRole: AgentRole, taskId?: string): Promise<SessionState> {
    logger.info(`Starting agent session with initial role ${initialRole}`);
    return this.sessionManager.createSession(initialRole, taskId);
  }
  
  /**
   * Generate Claude instructions for the current session
   * @returns Formatted instructions for Claude Desktop
   */
  async generateClaudeInstructions(): Promise<string> {
    const session = this.sessionManager.getActiveSession();
    if (!session) {
      throw new Error('No active session for generating instructions');
    }
    
    try {
      // Load blueprint for the active role
      const blueprint = await this.blueprintLoader.loadBlueprint(session.activeRole);
      
      // Create replacements map
      const replacements = new Map<string, string>([
        ['SESSION_ID', session.sessionId],
        ['AGENT_NAME', blueprint.name],
        ['AGENT_ROLE', session.activeRole.toString()],
        ['MEMORY_PATH', session.contextPath],
        ['ACCESS_LEVEL', blueprint.accessLevel.join(', ')],
        ['CKG_QUERY_ACCESS', blueprint.accessLevel.includes('CKG_READ') ? 'ENABLED' : 'DISABLED'],
        ['CKG_UPDATE_ACCESS', blueprint.accessLevel.includes('CKG_READ_WRITE') ? 'ENABLED' : 'DISABLED'],
        ['COMMAND_EXECUTION_ACCESS', blueprint.accessLevel.includes('COMMAND_EXECUTION') ? 'ENABLED' : 'DISABLED'],
        ['FILE_OPERATIONS_ACCESS', blueprint.accessLevel.includes('FILE_OPERATIONS') ? 'ENABLED' : 'DISABLED'],
        ['LLM_API_ACCESS', blueprint.accessLevel.includes('LLM_API') ? 'ENABLED' : 'DISABLED'],
      ]);
      
      // Add task info if available
      if (session.taskId) {
        const task = await this.getTask(session.taskId);
        if (task) {
          replacements.set('TASK_TITLE', task.title);
          replacements.set('TASK_DESCRIPTION', task.description);
          replacements.set('TASK_TYPE', task.type);
          replacements.set('TASK_STATUS', task.status);
        }
      }
      
      // Customize blueprint with replacements
      const instructions = this.blueprintLoader.customizeBlueprint(blueprint, replacements);
      
      // Add memory context if available
      let fullInstructions = instructions;
      try {
        const contextContent = await fs.readFile(session.contextPath, 'utf-8');
        fullInstructions += '\n\n## Current Memory Context\n\n```\n' + contextContent + '\n```\n';
      } catch (error) {
        logger.warn(`Could not load memory context from ${session.contextPath}:`, error);
      }
      
      // Add transition notes if available
      if (session.transitionNotes) {
        fullInstructions += '\n\n## Transition Notes\n\n' + session.transitionNotes + '\n';
      }
      
      // Add HITL state if available
      if (session.hitlState) {
        fullInstructions += '\n\n## HITL State\n\n' + session.hitlState + '\n';
      }
      
      return fullInstructions;
    } catch (error) {
      logger.error('Error generating Claude instructions:', error);
      throw error;
    }
  }
  
  /**
   * Transition to a different agent role
   * @param newRole New agent role
   * @param notes Transition notes
   * @returns Updated session state
   */
  async transitionTo(newRole: AgentRole, notes?: string): Promise<SessionState> {
    return this.sessionManager.transitionTo(newRole, notes);
  }
  
  /**
   * Update task status
   * @param taskId Task ID
   * @param status New status
   * @returns Updated task
   */
  async updateTaskStatus(taskId: string, status: string): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Update status
    task.status = status;
    
    // Save task to file
    const tasksPath = path.join(this.memoryPath, 'tasks');
    await fs.writeFile(
      path.join(tasksPath, `${taskId}.json`),
      JSON.stringify(task, null, 2),
      'utf-8'
    );
    
    // Update session task state if it's the active task
    const session = this.sessionManager.getActiveSession();
    if (session && session.taskId === taskId) {
      await this.sessionManager.updateTaskState(status);
    }
    
    logger.info(`Updated task ${taskId} status to ${status}`);
    return task;
  }
  
  /**
   * Get a task by ID
   * @param taskId Task ID
   * @returns Task or undefined if not found
   */
  async getTask(taskId: string): Promise<Task | undefined> {
    const tasksPath = path.join(this.memoryPath, 'tasks');
    const taskPath = path.join(tasksPath, `${taskId}.json`);
    
    try {
      const taskData = await fs.readFile(taskPath, 'utf-8');
      return JSON.parse(taskData) as Task;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined; // File not found
      }
      throw error;
    }
  }
  
  /**
   * Assign a task to a specific agent role
   * @param taskId Task ID
   * @param role Agent role
   * @returns Updated task
   */
  async assignTask(taskId: string, role: AgentRole): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Update assigned role
    task.assignedRole = role;
    
    // Save task to file
    const tasksPath = path.join(this.memoryPath, 'tasks');
    await fs.writeFile(
      path.join(tasksPath, `${taskId}.json`),
      JSON.stringify(task, null, 2),
      'utf-8'
    );
    
    logger.info(`Assigned task ${taskId} to role ${role}`);
    return task;
  }
  
  /**
   * Set HITL state in the current session
   * @param hitlState HITL state information
   * @returns Updated session state
   */
  async setHitlState(hitlState: string): Promise<SessionState> {
    return this.sessionManager.setHitlState(hitlState);
  }
  
  /**
   * Get active session information
   * @returns Current session state or undefined if no active session
   */
  getActiveSession(): SessionState | undefined {
    return this.sessionManager.getActiveSession();
  }
  
  /**
   * End the current session
   * @returns True if session was successfully ended
   */
  async endSession(): Promise<boolean> {
    return this.sessionManager.endSession();
  }
  
  /**
   * List all available sessions
   * @returns Array of session IDs
   */
  async listSessions(): Promise<string[]> {
    return this.sessionManager.listSessions();
  }
  
  /**
   * List all available tasks
   * @returns Array of tasks
   */
  async listTasks(): Promise<Task[]> {
    const tasksPath = path.join(this.memoryPath, 'tasks');
    
    try {
      await fs.mkdir(tasksPath, { recursive: true });
      const files = await fs.readdir(tasksPath);
      
      const tasks: Task[] = [];
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const taskData = await fs.readFile(path.join(tasksPath, file), 'utf-8');
            const task = JSON.parse(taskData) as Task;
            tasks.push(task);
          } catch (error) {
            logger.error(`Error reading task file ${file}:`, error);
          }
        }
      }
      
      return tasks;
    } catch (error) {
      logger.error('Error listing tasks:', error);
      return [];
    }
  }
}

export default AgentSystem;

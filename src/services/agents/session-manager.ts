/**
 * Agent Session Manager for Warp
 * 
 * Manages agent sessions, transitions, and state persistence
 * for the simulated multi-agent system using Claude Desktop.
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

// Agent roles supported by the system
export enum AgentRole {
  ORCHESTRATOR = 'ORCHESTRATOR',
  PRODUCT_LEAD = 'PRODUCT_LEAD',
  DESIGN_ENGINEER = 'DESIGN_ENGINEER',
  FRONTEND_ENGINEER = 'FRONTEND_ENGINEER',
  BACKEND_ENGINEER = 'BACKEND_ENGINEER',
  QA_TESTER = 'QA_TESTER'
}

// Session state interface
export interface SessionState {
  sessionId: string;
  activeRole: AgentRole;
  previousRole?: AgentRole;
  taskId?: string;
  taskState: string;
  lastUpdated: string;
  contextPath: string;
  transitionNotes?: string;
  hitlState?: string;
}

/**
 * Agent Session Manager
 * Handles creating, tracking, and transitioning between agent sessions
 */
export class AgentSessionManager {
  private blueprintsPath: string;
  private sessionsPath: string;
  private memoryPath: string;
  private activeSession?: SessionState;
  
  /**
   * Constructor
   * @param rootPath Project root path
   */
  constructor(rootPath: string) {
    this.blueprintsPath = path.join(rootPath, 'src', 'blueprints');
    this.sessionsPath = path.join(rootPath, '.warp_memory', 'sessions');
    this.memoryPath = path.join(rootPath, '.warp_memory', 'agents');
    
    // Ensure necessary directories exist
    this.ensureDirectories();
  }
  
  /**
   * Create necessary directories if they don't exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsPath, { recursive: true });
      await fs.mkdir(this.memoryPath, { recursive: true });
      
      // Create a directory for each agent role
      for (const role of Object.values(AgentRole)) {
        await fs.mkdir(path.join(this.memoryPath, role.toLowerCase()), { recursive: true });
      }
      
      logger.info('Agent session directories ensured.');
    } catch (error) {
      logger.error('Error creating agent session directories:', error);
      throw error;
    }
  }
  
  /**
   * Create a new agent session
   * @param role Initial agent role
   * @param taskId Optional task ID
   * @returns Session state
   */
  async createSession(role: AgentRole, taskId?: string): Promise<SessionState> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    const contextPath = path.join(this.memoryPath, role.toLowerCase(), 'active_context.md');
    
    const session: SessionState = {
      sessionId,
      activeRole: role,
      taskId,
      taskState: 'INITIALIZED',
      lastUpdated: now,
      contextPath
    };
    
    // Save the session state
    await this.saveSessionState(session);
    
    // Set as active session
    this.activeSession = session;
    
    logger.info(`Created new agent session: ${sessionId} with role ${role}`);
    return session;
  }
  
  /**
   * Load an existing session
   * @param sessionId Session ID to load
   * @returns Session state
   */
  async loadSession(sessionId: string): Promise<SessionState> {
    try {
      const sessionFilePath = path.join(this.sessionsPath, `${sessionId}.json`);
      const sessionData = await fs.readFile(sessionFilePath, 'utf-8');
      const session = JSON.parse(sessionData) as SessionState;
      
      // Set as active session
      this.activeSession = session;
      
      logger.info(`Loaded agent session: ${sessionId} with role ${session.activeRole}`);
      return session;
    } catch (error) {
      logger.error(`Error loading session ${sessionId}:`, error);
      throw new Error(`Failed to load session ${sessionId}: ${error.message}`);
    }
  }
  
  /**
   * Save current session state
   * @param session Session state to save (uses activeSession if not provided)
   */
  async saveSessionState(session?: SessionState): Promise<void> {
    const sessionToSave = session || this.activeSession;
    if (!sessionToSave) {
      throw new Error('No active session to save');
    }
    
    try {
      // Update timestamp
      sessionToSave.lastUpdated = new Date().toISOString();
      
      // Save to file
      const sessionFilePath = path.join(this.sessionsPath, `${sessionToSave.sessionId}.json`);
      await fs.writeFile(sessionFilePath, JSON.stringify(sessionToSave, null, 2), 'utf-8');
      
      logger.info(`Saved session state: ${sessionToSave.sessionId}`);
    } catch (error) {
      logger.error('Error saving session state:', error);
      throw error;
    }
  }
  
  /**
   * Transition to a different agent role
   * @param newRole New agent role
   * @param transitionNotes Notes for the transition
   * @returns Updated session state
   */
  async transitionTo(newRole: AgentRole, transitionNotes?: string): Promise<SessionState> {
    if (!this.activeSession) {
      throw new Error('No active session for transition');
    }
    
    try {
      // Update session state
      const previousRole = this.activeSession.activeRole;
      this.activeSession.previousRole = previousRole;
      this.activeSession.activeRole = newRole;
      this.activeSession.transitionNotes = transitionNotes;
      this.activeSession.contextPath = path.join(this.memoryPath, newRole.toLowerCase(), 'active_context.md');
      
      // Save updated state
      await this.saveSessionState();
      
      logger.info(`Transitioned from ${previousRole} to ${newRole} in session ${this.activeSession.sessionId}`);
      return this.activeSession;
    } catch (error) {
      logger.error('Error during agent transition:', error);
      throw error;
    }
  }
  
  /**
   * Update task state in the session
   * @param taskState New task state
   * @returns Updated session state
   */
  async updateTaskState(taskState: string): Promise<SessionState> {
    if (!this.activeSession) {
      throw new Error('No active session for task update');
    }
    
    try {
      // Update task state
      this.activeSession.taskState = taskState;
      
      // Save updated state
      await this.saveSessionState();
      
      logger.info(`Updated task state to ${taskState} in session ${this.activeSession.sessionId}`);
      return this.activeSession;
    } catch (error) {
      logger.error('Error updating task state:', error);
      throw error;
    }
  }
  
  /**
   * Get the active session state
   * @returns Current session state or undefined if no active session
   */
  getActiveSession(): SessionState | undefined {
    return this.activeSession;
  }
  
  /**
   * Set HITL state in the session
   * @param hitlState HITL state information
   * @returns Updated session state
   */
  async setHitlState(hitlState: string): Promise<SessionState> {
    if (!this.activeSession) {
      throw new Error('No active session for HITL update');
    }
    
    try {
      // Update HITL state
      this.activeSession.hitlState = hitlState;
      
      // Save updated state
      await this.saveSessionState();
      
      logger.info(`Set HITL state in session ${this.activeSession.sessionId}`);
      return this.activeSession;
    } catch (error) {
      logger.error('Error setting HITL state:', error);
      throw error;
    }
  }
  
  /**
   * Generate agent instructions based on blueprint and session state
   * @param role Agent role (uses active session role if not provided)
   * @returns Formatted instruction string for Claude
   */
  async generateAgentInstructions(role?: AgentRole): Promise<string> {
    const agentRole = role || this.activeSession?.activeRole;
    if (!agentRole) {
      throw new Error('No agent role specified for instructions');
    }
    
    try {
      // Load blueprint template
      const blueprintPath = path.join(this.blueprintsPath, `${agentRole.toLowerCase()}.md`);
      let blueprint = await fs.readFile(blueprintPath, 'utf-8');
      
      // Replace placeholders with actual values
      if (this.activeSession) {
        blueprint = blueprint
          .replace('{{SESSION_ID}}', this.activeSession.sessionId)
          .replace('{{MEMORY_PATH}}', this.activeSession.contextPath)
          .replace('{{TASK_ID}}', this.activeSession.taskId || 'N/A')
          .replace('{{TASK_STATE}}', this.activeSession.taskState);
        
        // Include transition notes if available
        if (this.activeSession.transitionNotes) {
          blueprint += `\n\n## Transition Notes\n\n${this.activeSession.transitionNotes}\n`;
        }
        
        // Include HITL state if available
        if (this.activeSession.hitlState) {
          blueprint += `\n\n## HITL State\n\n${this.activeSession.hitlState}\n`;
        }
      }
      
      logger.info(`Generated instructions for ${agentRole} role`);
      return blueprint;
    } catch (error) {
      logger.error(`Error generating agent instructions for ${agentRole}:`, error);
      throw error;
    }
  }
  
  /**
   * End the current session
   * @returns True if session was successfully ended
   */
  async endSession(): Promise<boolean> {
    if (!this.activeSession) {
      return false;
    }
    
    try {
      // Update session state to ended
      this.activeSession.taskState = 'ENDED';
      await this.saveSessionState();
      
      // Clear active session
      const sessionId = this.activeSession.sessionId;
      this.activeSession = undefined;
      
      logger.info(`Ended session ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('Error ending session:', error);
      return false;
    }
  }
  
  /**
   * List all available sessions
   * @returns Array of session IDs
   */
  async listSessions(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.sessionsPath);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      logger.error('Error listing sessions:', error);
      return [];
    }
  }
}

export default AgentSessionManager;

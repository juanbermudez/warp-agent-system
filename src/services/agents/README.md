# Warp Agent System Implementation

This directory contains the core implementation of the Warp Agent System, which simulates a multi-agent architecture using Claude Desktop as the execution environment.

## Architecture

The agent system is designed with these key components:

1. **AgentSystem**: Central interface for managing the agent system
2. **AgentSessionManager**: Handles agent sessions, transitions, and state persistence
3. **BlueprintLoader**: Manages blueprint loading and customization

## Key Components

### AgentSystem

The `AgentSystem` class provides the main interface for interacting with the agent system:

- Creating and managing agent sessions
- Task creation, assignment, and tracking
- Generating Claude instructions
- Managing transitions between agent roles
- Setting HITL states

### AgentSessionManager

The `AgentSessionManager` handles the details of session management:

- Creating and loading sessions
- Saving session state
- Managing transitions between agent roles
- Tracking task state across transitions
- Setting HITL state

### BlueprintLoader

The `BlueprintLoader` handles loading and processing agent blueprints:

- Loading blueprint files from disk
- Parsing them into structured sections
- Customizing them with session and task context
- Caching blueprints for efficiency

## Data Structures

### SessionState

The `SessionState` interface represents the current state of an agent session:

```typescript
interface SessionState {
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
```

### AgentRole

The `AgentRole` enum defines the available agent roles:

```typescript
enum AgentRole {
  ORCHESTRATOR = 'ORCHESTRATOR',
  PRODUCT_LEAD = 'PRODUCT_LEAD',
  DESIGN_ENGINEER = 'DESIGN_ENGINEER',
  FRONTEND_ENGINEER = 'FRONTEND_ENGINEER',
  BACKEND_ENGINEER = 'BACKEND_ENGINEER',
  QA_TESTER = 'QA_TESTER'
}
```

### Blueprint

The `Blueprint` interface represents a processed blueprint:

```typescript
interface Blueprint {
  raw: string;
  sections: Map<string, string>;
  name: string;
  role: AgentRole;
  accessLevel: string[];
}
```

## Usage Examples

### Starting a Session

```typescript
const agentSystem = new AgentSystem('/path/to/project');
await agentSystem.initialize();
const session = await agentSystem.startSession(AgentRole.ORCHESTRATOR);
```

### Generating Instructions

```typescript
const instructions = await agentSystem.generateClaudeInstructions();
// Use instructions with Claude Desktop
```

### Transitioning Between Roles

```typescript
await agentSystem.transitionTo(
  AgentRole.BACKEND_ENGINEER,
  'Implementing auth endpoints'
);
```

### Managing Tasks

```typescript
const task = await agentSystem.createTask(
  'Implement Auth API',
  'Create JWT-based authentication system',
  'FEATURE'
);
await agentSystem.assignTask(task.id, AgentRole.BACKEND_ENGINEER);
await agentSystem.updateTaskStatus(task.id, 'IN_PROGRESS');
```

## Directory Structure

```
/src/services/agents/
├── agent-system.ts       # Main agent system interface
├── session-manager.ts    # Session management
├── blueprint-loader.ts   # Blueprint loading and processing
└── index.ts              # Module exports
```

## Security Considerations

1. **Command Execution**: The agent system is designed to enforce HITL approval before executing commands.
2. **Authentication**: Appropriate authentication should be added for production environments.
3. **File Access**: The system should be restricted to accessing only the project directory.

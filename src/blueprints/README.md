# Warp Agent System Blueprints

This directory contains the blueprint templates for the simulated multi-agent system. Each blueprint defines the behavior, responsibilities, and capabilities of a specific agent role within the Warp system.

## Overview

The Warp Agent System uses Claude Desktop as the execution environment but simulates a multi-agent architecture through:

1. **Role-Specific Blueprints**: Detailed instructions for each agent role
2. **Context Isolation**: Separate memory contexts for each agent
3. **State Transition**: Clear mechanisms for switching between agent roles
4. **Task Management**: Shared task tracking across agent transitions

## Blueprint Structure

Each agent blueprint follows a standardized structure:

- **System Configuration**: Basic agent identity and settings
- **Core Role Definition**: Primary responsibilities and function
- **Specialized Capabilities**: Role-specific skill descriptions
- **Context Handling**: Guidelines for retrieving and using context
- **Decision Framework**: Criteria for making role-specific decisions
- **Session Structure**: Format for agent interaction sessions

## Available Blueprints

- **Orchestrator**: Central coordinator for the agent system
- **Product Lead**: Defines high-level tasks and ensures product requirements are met
- **Design Engineer**: Creates UI/UX specifications and design system components
- **Frontend Engineer**: Implements user interfaces and client-side logic
- **Backend Engineer**: Implements server-side logic, APIs, and data storage
- **QA Tester**: Ensures quality through comprehensive testing and validation

## Customization

Blueprints use placeholders that are replaced during instruction generation:

- `{{SESSION_ID}}`: Current session identifier
- `{{AGENT_NAME}}`: Name of the agent
- `{{AGENT_ROLE}}`: Role enum value
- `{{MEMORY_PATH}}`: Path to the agent's memory context
- `{{ACCESS_LEVEL}}`: Access permissions
- `{{TASK_ID}}`, `{{TASK_TITLE}}`, etc.: Task-related information

## Usage

The blueprints are loaded by the `BlueprintLoader` class and customized by the `AgentSystem` based on the current session state and task context. The resulting instructions are then provided to Claude Desktop to guide its behavior.

## Extending the System

To add a new agent role:

1. Create a new blueprint file following the established pattern
2. Add the role to the `AgentRole` enum in `session-manager.ts`
3. Update the `AgentSystem` class if necessary
4. Update the CLI tool to support the new role

## Security Considerations

Blueprints should not contain sensitive information. Access controls and capabilities should be carefully defined to ensure agents only have access to the resources they need.

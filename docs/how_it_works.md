# How Warp Agent System Works

This document explains the core functionality of the Warp Agent System and how the different components interact to enable AI-powered software development with human oversight.

## System Overview

The Warp Agent System operates as a coordinated multi-agent system with the following key elements:

1. **Orchestrator Agent**: Central coordinator that manages the task lifecycle
2. **Specialized Agents**: Role-specific agents (PL, DE, FE, BE, QA) that handle different aspects of development
3. **Code Knowledge Graph (CKG)**: Central database storing all project context
4. **Human-in-the-Loop (HITL)**: System for human oversight at critical checkpoints
5. **Model Context Protocol (MCP) Server**: Interface for agent communication

## Core Workflow

### 1. Task Input and Clarification

1. A task is submitted to the Orchestrator agent
2. The Orchestrator assigns the task to the Product Lead (PL) agent
3. The PL clarifies requirements, potentially requesting human input
4. The PL collaborates with the Design Engineer (DE) on specifications
5. The PL submits a high-level plan to the Orchestrator

### 2. Task Decomposition

1. The Orchestrator performs Just-In-Time (JIT) decomposition
2. The task is broken into sub-tasks with metadata:
   - Task ID, description
   - Dependencies between sub-tasks
   - Assigned agent role
   - Type (code, command, etc.)
3. The decomposition is stored in the CKG
4. The plan is sent for HITL review

### 3. Task Assignment and Execution

1. Upon plan approval, the Orchestrator analyzes task dependencies
2. Runnable tasks (no pending dependencies) are assigned to appropriate agents
3. Agents query the CKG for relevant context
4. Agents perform their assigned work:
   - BE/FE agents write code
   - DE agent creates designs
   - QA agent creates and runs tests
5. Commands require HITL approval before execution
6. Agents update the CKG with their work products

### 4. Review and Validation

1. Code changes trigger HITL code review
2. QA testing results trigger HITL QA sign-off
3. Final work requires HITL approval
4. The Orchestrator tracks completion of all sub-tasks
5. When all sub-tasks are complete, the task is marked as Done

## Component Interactions

### CKG Interaction

1. Agents use `query_ckg` to retrieve context:
   - Project structure
   - Existing code
   - Requirements and specifications
   - Agent personas and rules
2. Agents use `update_ckg` to store results:
   - Code changes
   - Design specifications
   - Test results
   - Task status updates

### HITL Interaction

1. The system creates HITL requests for:
   - Plan review
   - Command approval
   - Code review
   - QA sign-off
   - Final approval
2. OS-level alerts notify humans of pending requests
3. Humans review and respond via:
   - Signal files (approve/reject)
   - Feedback text
4. The system processes responses and unblocks waiting agents

### Agent Management

1. The Orchestrator monitors agent status and resource utilization
2. Agents are spawned using Claude Code CLI with appropriate configurations
3. Context size is monitored to prevent token limit issues
4. Agent handoffs occur when context limits are approached
5. Idle agents are terminated to free resources

## Implementation Approach

The system is implemented using:

1. **TypeScript/Node.js**: For the MCP server and core toolkit
2. **Dgraph**: Graph database for the CKG
3. **Claude Code CLI**: For agent spawning and execution
4. **File System**: For HITL signal exchange

## Current Status and Next Steps

The system currently exists as a Proof of Concept with all core components implemented and validated through a sample Flask task. The next steps include:

1. Comprehensive testing using the testing plan
2. Enhancement of core functionality
3. Expansion of system capabilities
4. Integration with external tools
5. Scaling for larger projects

Please refer to the specific component documentation for detailed information about each part of the system.

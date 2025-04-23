# Warp Agent System: Architecture

## System Architecture Overview

### Components

1. **Central Coordinator (Orchestrator Agent)**
   - Acts as the central hub for the system
   - Manages task lifecycle state machine
   - Performs JIT decomposition of tasks
   - Conducts dependency analysis
   - Handles agent monitoring and resource management
   - Routes HITL requests and responses

2. **Specialized Workers**
   - **Product Lead (PL)**: Requirements clarification, high-level planning
   - **Design Engineer (DE)**: UI/UX specs, design review
   - **Frontend Engineer (FE)**: Frontend implementation
   - **Backend Engineer (BE)**: Backend implementation
   - **QA Tester (QA)**: Testing, validation, bug reporting

3. **Unified Knowledge Base**
   - Local Code Knowledge Graph (CKG) database (Dgraph/Neo4j)
   - Stores code structure, project context, rules, personas, workflows
   - Accessed via specific graph interaction tools

4. **HITL Interaction Mechanism**
   - File-based signaling in [project_root]/.warp_hitl/
   - Format: [action]_[type]_[id].signal (e.g., approve_plan_T123.signal)
   - Orchestrator processes signals and manages timeouts

### Data Flow

1. Task enters system via Orchestrator
2. Orchestrator assigns to PL for clarification
3. PL collaborates with DE for specification
4. Orchestrator decomposes task and analyzes dependencies
5. HITL review of plan
6. Orchestrator assigns subtasks to specialized agents
7. Agents query CKG for context and execute tasks
8. Command execution requires HITL approval
9. Generated code submitted for review
10. QA validates completed work
11. Final approval by PL and Orchestrator

### Context Management

Agents interact primarily through the CKG, which enables:
- Persistent storage of project knowledge
- Cross-agent communication
- Context handoff for long-running tasks
- Historical tracking of decisions and artifacts

### Resource Management

- Orchestrator tracks agent status and resource utilization
- Implements scaling based on queue lengths and parallelism opportunities
- Manages context size and triggers handoffs when needed

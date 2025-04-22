# **Warp Agent System: MVP Proof of Concept \- Setup PRD & Technical Specification**

## **1\. Introduction**

### **1.1. Purpose**

This document provides the detailed Product Requirements Document (PRD) and Technical Specifications for setting up the backend multi-agent system for the **Warp MVP Proof of Concept (PoC)**. The primary goal is to establish a functional, locally running agent system capable of executing software development tasks according to the Warp methodology. This setup will initially be observed via a read-only UI (as per warp-dogfooding-strategy-v1) and serve as the foundation for the full Warp application. This specification is intended to be detailed enough to guide implementation, potentially by a setup-focused LLM assistant, within a **Claude Code CLI** or similar local LLM execution environment.

### **1.2. Vision Recap**

Warp aims to accelerate high-quality software development by integrating AI deeply into structured, proven workflows, leveraging precise context from a unified knowledge base (CKG/Memory Bank) and ensuring human oversight at critical junctures.

### **1.3. PoC Goals**

* Instantiate and configure the core multi-agent architecture (Orchestrator, PL, DE, FE, BE, QA).  
* Implement the Enhanced Memory Bank concept via a local CKG and graph interaction tools.  
* Implement the core task workflow including JIT decomposition, dependency analysis, potential parallel execution, and context management (including handoff).  
* Implement the defined HITL checkpoints using OS-level alerts and an external signaling mechanism.  
* Implement basic, secure shell command execution capability for agents.  
* Validate the feasibility and coordination logic of the multi-agent system on sample tasks.

### **1.4. Scope**

* **In Scope:** Local setup and configuration of the agent system logic, CKG schema and population (from code/docs/context files), conceptual tool interfaces, HITL triggering, basic command execution, dynamic resource management (conceptual logic). Assumes a local LLM environment (like Claude Code CLI) capable of running multiple agent instances.  
* **Out of Scope:** Building the interactive Electron UI, advanced CKG reasoning/inference, advanced error handling, complex GUI tool integrations (generate\_wireframe), sophisticated security sandboxing beyond basic checks.

## **2\. System Architecture Overview (Conceptual)**

* **Central Coordinator:** The Orchestrator agent acts as the central hub.  
* **Specialized Workers:** PL, DE, FE, BE, QA agents perform specific roles, spawned and managed by the Orchestrator.  
* **Unified Knowledge:** Agents interact primarily through a **local Code Knowledge Graph (CKG)** database (Dgraph/Neo4j). The CKG stores code structure, project context, rules, personas, workflows etc. It is populated initially and accessed via specific graph interaction tools.  
* **Workflow:** Task-driven, involving JIT decomposition, dependency analysis (enabling potential parallelism), HITL reviews (plan, design, command, code, QA), and iterative execution.  
* **Execution:** Agents perform actions including CKG queries/updates (via tools), LLM calls (via local CLI environment/OpenRouter), triggering HITL alerts, and executing shell commands (with approval).

graph TD  
    User \--\>|Task Goal| Orch(Orchestrator);  
    Orch \--\>|Assign| PL(Product\_Lead);  
    PL \--\>|Reqs Clarification| Orch;  
    PL \--\>|Collaborate| DE(Design\_Engineer);  
    PL \--\>|High-Level Plan| Orch;

    Orch \--\>|Decompose Task| Orch;  
    Orch \--\>|Analyze Deps| Tools(Core Agent Toolkit);  
    Orch \--\>|Plan Review| HITL{Human-in-the-Loop};  
    HITL \--\>|Approval| Orch;

    Orch \--\>|Assign Sub-Task| FE(Frontend\_Engineer);  
    Orch \--\>|Assign Sub-Task| BE(Backend\_Engineer);

    DE \--\>|Write Design Specs| Tools;  
    FE \--\>|Query Specs/Context/Rules| Tools;  
    BE \--\>|Query Specs/Context/Rules| Tools;

    FE \--\>|Execute Command?| Orch;  
    BE \--\>|Execute Command?| Orch;  
    Orch \--\>|Command Approval?| HITL;  
    HITL \--\>|Cmd OK| Orch;  
    Orch \--\>|Run Cmd| Tools;  
    Tools \--\>|Cmd Output| Orch;  
    Orch \--\>|Log Cmd Output| CKG\[(CKG / Memory)\];

    FE \--\>|Generate Code| Tools;  
    BE \--\>|Generate Code| Tools;  
    FE \--\>|Write Diff| CKG;  
    BE \--\>|Write Diff| CKG;

    FE \--\>|Code Review?| Orch;  
    BE \--\>|Code Review?| Orch;  
    Orch \--\>|Code Review?| HITL;  
    HITL \--\>|Code OK| Orch;  
    Orch \--\>|Merge/Apply Code| Tools;

    Orch \--\>|Assign QA Task| QA(QA\_Tester);  
    QA \--\>|Query Context/Plan| Tools;  
    QA \--\>|Execute Tests (Cmd?)| Orch;  
    QA \--\>|Report Bugs/Status| CKG;  
    QA \--\>|QA Sign-off?| Orch;  
    Orch \--\>|QA Sign-off?| HITL;  
    HITL \--\>|QA OK| Orch;  
    Orch \--\>|Final Approval?| PL;  
    PL \--\>|Final OK?| Orch;  
    Orch \--\>|Task Done| User;

    %% Agent Resource Management (Conceptual)  
    Orch \--\>|Monitor Load| Orch;  
    Orch \--\>|Request Scale Up?| HITL;  
    HITL \--\>|Scale OK| Orch;  
    Orch \--\>|Spawn Agent Instance| FE;  
    Orch \--\>|Spawn Agent Instance| BE;  
    Orch \--\>|Spawn Agent Instance| QA;  
    Orch \--\>|Terminate Idle Agent| FE;

    %% Tools interact with CKG  
    Tools \--\> CKG;

## **3\. Environment Setup Requirements**

* **LLM Environment:** Claude Code CLI (or equivalent) installed and configured, capable of running Anthropic models (e.g., Claude 3.5 Sonnet, Haiku) locally or via API key configured within the CLI environment (or via OpenRouter key if using that gateway). Must support running multiple concurrent agent processes/scripts.  
* **Runtime:** Python \>= 3.10 or Node.js \>= 18 (Node.js/TypeScript recommended for consistency with potential Electron frontend).  
* **Graph Database:** Local installation of Dgraph or Neo4j (or ability to run embedded version).  
* **Core Tools:** Git.  
* **Project Dependencies:** Relevant language runtimes (Node, Python), package managers (npm, pip), linters (eslint, flake8), test runners (pytest, jest) for the *target software project* being worked on.  
* **Alerting (macOS Example):** osascript command available. (Adapt for other OS).  
* **Project Directory Structure:** The system expects a /.warp\_memory/ (or similar configurable name) directory within the target project's root for storing certain outputs or temporary files if needed, and potentially an input Claude.md or similar config for initial CKG population.

## **4\. Agent Configuration & Initialization Specifications**

*(Instructions for the setup process/LLM)*

### **4.1. Orchestrator Agent (Orchestrator)**

* **Initialization:** Main persistent process/script. Input: project\_root\_path. Action: Load project config, initialize connection to Graph DB, start resource tracker (1 of each role), monitor for user tasks/HITL signals.  
* **Core Logic Specification:**  
  * Task Lifecycle State Machine: Implement states (ToDo, Decomposing, AwaitingPlanReview, InProgress, Blocked\*, Done, Error).  
  * JIT Decomposition Trigger: On task activation, delegate to PL/self for decomposition using LLM (via OpenRouter/Claude CLI). Parse output (Zod schema) into sub-task list with metadata (incl. taskId, subTaskId, description, dependencies: List\[subTaskId\], assignedRole: Role, status, ckgLinks, type: 'code' | 'command', commandDetails). Store plan in CKG linked to parent task. Trigger HITL Plan Review.  
  * Dependency Analysis & Parallelism: On plan approval, use analyze\_task\_dependencies tool. Maintain a queue of runnable sub-tasks.  
  * Task Assignment: Assign runnable tasks to Idle agents of correct role based on queue and resource availability (Section 8). Update task/agent states.  
  * Agent Monitoring: Track agent status. Monitor context size (get\_context\_size) \-\> trigger handoff via agent instruction.  
  * Resource Management: Implement Strategy (Section 8\) \- monitor queues/parallelism, trigger HITL scale requests, spawn/terminate instances (subprocess.Popen etc.).  
  * HITL Handling: Monitor external signals (/.warp\_hitl/ files or other mechanism). Parse signals, update states, unblock agents. Route feedback if provided in rejection signal.  
* **Required Tools Access:** All tools (Section 6), especially graph query/update, process management, dependency analysis, alerting, context size monitoring.

### **4.2. Product Lead Agent (Product\_Lead)**

* **Initialization:** Spawned by Orchestrator. Input: Task goal, project brief context (via query\_ckg). Persona: Loaded via query\_ckg.  
* **Core Logic Specification:** Requirement clarification loop (LLM call \-\> HITL trigger if needed). High-level feature/epic breakdown (LLM call \-\> update\_ckg). Plan/Architecture review loop (Receive plan via Orchestrator \-\> LLM analysis \-\> HITL trigger for approval/rejection). Final feature review loop.  
* **Required Tools Access:** query\_ckg, update\_ckg, trigger\_hitl\_alert.

### **4.3. Design Engineer Agent (Design\_Engineer)**

* **Initialization:** Spawned by Orchestrator. Input: Requirements context (via query\_ckg). Persona: Loaded via query\_ckg.  
* **Core Logic Specification:** Generate UI/UX specs (LLM call, potentially generate\_wireframe tool \-\> update\_ckg). Review FE implementation (Receive diff path/context \-\> LLM analysis vs specs \-\> HITL trigger for approval/rejection).  
* **Required Tools Access:** query\_ckg, update\_ckg, generate\_wireframe (opt), fetch\_design\_system\_component (opt), trigger\_hitl\_alert.

### **4.4. Backend Engineer Agent (Backend\_Engineer)**

* **Initialization:** Spawned by Orchestrator. Input: Sub-task object (incl. description, CKG links, rule IDs). Persona: Loaded via query\_ckg.  
* **Core Logic Specification:**  
  1. Parse input sub-task object.  
  2. Formulate context query based on metadata \-\> Call query\_ckg (requesting relevant code snippets, architecture notes, API specs, rules, persona reminder).  
  3. Perform step-by-step thinking (LLM call, log to temp storage/update\_ckg).  
  4. Generate code (LLM call with composed context+rules).  
  5. Run local validation: Call lint\_code. If lint passes, call run\_tests (via execute\_shell\_command \- requires HITL approval). Handle failures (attempt self-correction loop or report error).  
  6. Format output as diff against original code (if any). Store diff (e.g., file \+ path in CKG update).  
  7. Update own active\_context node in CKG via update\_ckg.  
  8. Signal completion ("Needs Code Review") to Orchestrator with diff reference.  
  9. Handle context handoff if instructed by Orchestrator.  
* **Required Tools Access:** query\_ckg, update\_ckg, execute\_shell\_command, lint\_code, run\_tests, LLM client.

### **4.5. Frontend Engineer Agent (Frontend\_Engineer)**

* **Initialization:** Spawned by Orchestrator. Input: Sub-task object, DE specs link. Persona: Loaded via query\_ckg.  
* **Core Logic Specification:** Similar to BE Agent, but uses DE specs as primary input for generation. Submits for DE/Lead review.  
* **Required Tools Access:** query\_ckg, update\_ckg, execute\_shell\_command, lint\_code, run\_tests, LLM client, fetch\_design\_system\_component (opt).

### **4.6. QA Tester Agent (QA\_Tester)**

* **Initialization:** Spawned by Orchestrator. Input: Feature context, requirements link, test plan link. Persona: Loaded via query\_ckg.  
* **Core Logic Specification:** Generate test cases (LLM call \-\> update\_ckg). Execute test cases (via execute\_shell\_command \+ HITL for automated; via HITL prompt for manual). Report results/bugs (via update\_ckg linking to tasks/code). Validate fixes. Signal QA status (via HITL).  
* **Required Tools Access:** query\_ckg, update\_ckg, execute\_shell\_command, run\_tests, trigger\_hitl\_alert.

## **5\. CKG / Enhanced Memory Bank Setup**

* **Initialization Script:** Create a setup script that:  
  * Initializes the local graph database (Dgraph/Neo4j).  
  * Defines the core CKG schema (Node labels: Project, Task, SubTask, File, Function, Class, Interface, Requirement, DesignSpec, ArchDecision, Rule, Persona, TestPlan, TestCase, BugReport, AgentInstance, etc. Relationship types: HAS\_TASK, DECOMPOSED\_INTO, DEPENDS\_ON, ASSIGNED\_TO, IMPLEMENTS, CALLS, IMPORTS, DOCUMENTS, SPECIFIED\_BY, TESTED\_BY, APPLIES\_TO, VIOLATES, LOGS\_TO, etc.). Use Zod schemas to define node properties for validation.  
  * Parses an initial configuration file (e.g., Claude.md or warp\_init.yaml) containing project rules, agent personas, standard workflow definitions, prompt templates.  
  * Populates the CKG with these initial configuration nodes (Rules, Personas, Workflows).  
  * Creates the /.warp\_memory/ directory if needed (primarily for temporary files like diffs or logs if not stored directly in CKG).  
* **Initial Content:** The input config file (Claude.md/warp\_init.yaml) must provide the foundational rules, personas, and prompt structures needed for agents to function.

## **6\. Core Agent Toolkit Implementation**

*(Detailed specifications for tool implementation)*

* **query\_ckg(query\_details: Dict) \-\> Dict**:  
  * Input: Dict specifying query type (e.g., getNodeById, findNodesByLabel, findRelatedNodes, keywordSearch, vectorSearch), parameters (IDs, labels, relationship types, keywords, embedding vector), required properties/fragments. Use Zod schema for input validation.  
  * Logic: Translate query\_details into appropriate graph query (GraphQL/DQL for Dgraph, Cypher for Neo4j). Execute query against DB. Format results (e.g., list of node properties, composed text snippets) into a structured Dict. Handle DB errors.  
  * Output: Dict containing query status and results.  
* **update\_ckg(payload: Dict) \-\> bool**:  
  * Input: Dict specifying update type (e.g., createNode, updateNodeProperties, createRelationship), node/relationship details, properties. Use Zod schema.  
  * Logic: Translate payload into graph DB mutation. Execute against DB. Handle errors.  
  * Output: Success/failure boolean.  
* **execute\_shell\_command(command: str, working\_dir: str, requires\_approval: bool \= True) \-\> Dict\[str, Any\]**:  
  * HITL Check: If requires\_approval, call trigger\_hitl\_alert with command details, wait for external signal file in /.warp\_hitl/ corresponding to approval. If rejected or timeout, return failure.  
  * Whitelist Check: Validate command against allowed patterns/executables. If disallowed, return failure.  
  * Execution: Use child\_process.spawn with cwd: working\_dir, shell: true (or parse command carefully), capture stdout/stderr streams.  
  * Output: {success: bool, stdout: str, stderr: str, exit\_code: int}. Ensure output streams are fully captured.  
* **get\_context\_size(agent\_instance\_id: str) \-\> Dict\[str, int\]**:  
  * Logic: Interface with the underlying LLM execution environment (e.g., specific Claude Code CLI command or library function) to retrieve current token count / context window state for the process associated with agent\_instance\_id. If unavailable, return estimate based on tracked message history length.  
  * Output: {token\_count: int, percentage\_used: float}.  
* **trigger\_hitl\_alert(message: str, title: str, metadata: Dict \= None) \-\> bool**:  
  * Logic: Construct OS-specific command (e.g., osascript for macOS). Execute command safely. Log the alert.  
  * Output: Success/failure boolean.  
* **(Implement other tools like list\_project\_files, fetch\_web\_content, git\_..., lint\_code, run\_tests, analyze\_task\_dependencies based on descriptions in previous config doc, ensuring they use appropriate libraries and error handling).**

## **7\. HITL Interaction Mechanism (MVP)**

* **Signaling:** File-based in \[project\_root\]/.warp\_hitl/.  
* **Format:** \[action\]\_\[type\]\_\[id\].signal (e.g., approve\_plan\_T123.signal, reject\_code\_S456.signal). Rejection files can optionally contain feedback text.  
* **Orchestrator Logic:** Scan directory periodically. Process signals: update CKG task/sub-task nodes, change agent states. Delete processed signal files. Implement timeout logic for waiting signals.

## **8\. Agent Resource Management Strategy (Implementation Detail)**

* **Orchestrator Logic:**  
  * Maintain counts of active/idle agents per role.  
  * Track task queue length per role.  
  * Check max\_instances\_per\_role config.  
  * If scale-up condition met (queue length \> threshold OR parallel tasks \> available agents), trigger HITL approval request via trigger\_hitl\_alert.  
  * If approved, use subprocess.Popen (or similar) to spawn a new agent script/process, passing necessary context (project path, agent ID, role).  
  * Monitor idle time of *temporary* instances. If idle\_time \> timeout\_threshold, terminate the process.

## **9\. Initial PoC Task Example**

* **Goal:** "Add a /health GET endpoint to the existing Flask backend service that returns {'status': 'ok'}."  
* **Setup:** Requires a sample Flask project, CKG populated with its structure, Claude.md with basic Python/Flask rules and BE persona.  
* **Execution:** Follows the detailed workflow in Section 3, testing decomposition, BE agent code generation, test generation, command execution (pytest), and multiple HITL checkpoints via the file signaling mechanism.
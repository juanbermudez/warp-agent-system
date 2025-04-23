# **Warp Agent System: MVP Proof of Concept \- Setup PRD & Technical Specification (v8 \- Scoped Inheritance)**

## **1\. Introduction**

### **1.1. Purpose**

This document provides the detailed Product Requirements Document (PRD) and Technical Specifications for setting up the backend multi-agent system for the **Warp MVP Proof of Concept (PoC)**. The primary goal is to establish a functional, locally running agent system capable of executing software development tasks according to the Warp methodology. This includes hierarchical task management, configurable workflow enforcement, JIT decomposition, CKG-based context retrieval **with scoped inheritance/overrides for configurations**, HITL checkpoints, and command execution. This setup will initially be observed via a read-only UI and serve as the foundation for the full Warp application. This specification is intended to guide implementation, potentially by a setup-focused LLM assistant, within a **Claude Code CLI** or similar local LLM execution environment.

### **1.2. Vision Recap**

Warp aims to accelerate high-quality software development by integrating AI deeply into structured, proven workflows (explicitly represented and enforceable via the CKG), leveraging precise context from a unified knowledge base (CKG) and ensuring human oversight at critical junctures. **Configurations like rules and workflows support inheritance and overrides based on scope (User, Project, Team, Org, Default) for flexible governance.**

### **1.3. PoC Goals**

* Instantiate and configure the core multi-agent architecture.  
* Implement the CKG concept via a local graph DB and graph interaction tools, including support for hierarchical task structures, representation of standard development workflows, and **scoped configurations with override logic**.  
* Implement the core task workflow including JIT decomposition guided by defined workflows, dependency analysis, potential parallel execution, and context management.  
* Implement the defined HITL checkpoints.  
* Implement basic, secure shell command execution capability.  
* Validate the feasibility and coordination logic of the multi-agent system, including workflow adherence and **correct application of scoped rules/preferences**, on sample tasks.

### **1.4. Scope**

* **In Scope:** Local setup of agent logic, CKG schema (incl. hierarchy, workflows, scoped configs), initial population from config/code/docs, conceptual tool interfaces (incl. scope-aware querying), HITL triggering, basic command execution, dynamic resource management logic.  
* **Out of Scope:** Interactive Electron UI build (beyond read-only observation), advanced CKG reasoning, advanced error handling, complex GUI tool integrations, sophisticated security sandboxing, **UI for managing scope hierarchy and overrides (MVP uses CKG population script)**.

## **2\. System Architecture Overview (Conceptual)**

* **Central Coordinator:** The Orchestrator agent.  
* **Specialized Workers:** PL, DE, FE, BE, QA agents.  
* **Unified Knowledge (CKG):** Local graph database (Dgraph/Neo4j) storing code structure, project context, **scoped rules**, **scoped personas**, **scoped development workflows**, and a hierarchical task structure. Accessed via graph interaction tools **that resolve configuration based on scope precedence**.  
* **Workflow:** Driven by the task hierarchy and enforced by **the effective Workflow configuration resolved for the task's scope**. PL defines Projects/Milestones. Orchestrator manages JIT decomposition according to the applicable Workflow, respecting dependencies and HITL reviews.  
* **Execution:** Agents perform actions including CKG queries/updates (requesting context/rules for their specific scope), LLM calls, HITL alerts, and command execution.

graph TD  
    User \--\>|Task Goal| PL(Product\_Lead);

    subgraph Planning\_and\_Decomposition \["Planning & Decomposition (Workflow & Scope Guided)"\]  
        PL \--\>|Defines| Project(CKG: Project Task);  
        Project \--\>|Contains| Milestone(CKG: Milestone Task);  
        Milestone \--\>|Contains| Task(CKG: Task);  
        PL \--\>|Reviews/Approves| Project;  
        PL \--\>|Reviews/Approves| Milestone;

        Task \--\>|Triggers JIT Decomp| Orch(Orchestrator);  
        Orch \--\>|Queries Applicable Workflow (Scope Resolved)| CKG\[(CKG / Memory)\]; %% Tool resolves scope  
        CKG \--\>|Returns Effective Workflow Steps| Orch;  
        Orch \--\>|Generates Plan (SubTasks)| Orch; %% Guided by Workflow Steps  
        Task \--\>|DecomposedInto| SubTask(CKG: SubTask);  
        Orch \--\>|Analyzes Dependencies| Tools(Core Agent Toolkit);  
        Orch \--\>|Plan Review| HITL{Human-in-the-Loop};  
        HITL \--\>|Approval| Orch;  
    end

    subgraph Execution\_and\_Review \["Execution & Review (Following Plan & Scope)"\]  
        Orch \--\>|Assign Sub-Task (Seq/Parallel)| FE(Frontend\_Engineer);  
        Orch \--\>|Assign Sub-Task (Seq/Parallel)| BE(Backend\_Engineer);  
        DE(Design\_Engineer) \--\>|Writes Specs| Tools;  
        FE \--\>|Queries CKG (Context, Effective Rules, Persona)| Tools; %% Tool resolves scope  
        BE \--\>|Queries CKG (Context, Effective Rules, Persona)| Tools; %% Tool resolves scope  
        FE \--\>|Executes Cmd?| Orch;  
        BE \--\>|Executes Cmd?| Orch;  
        Orch \--\>|Cmd Approval?| HITL;  
        HITL \--\>|Cmd OK| Orch;  
        Orch \--\>|Runs Cmd| Tools;  
        Tools \--\>|Cmd Output| Orch;  
        Orch \--\>|Logs Output| CKG;  
        FE \--\>|Generates Code| Tools;  
        BE \--\>|Generates Code| Tools;  
        FE \--\>|Writes Diff| CKG;  
        BE \--\>|Writes Diff| CKG;  
        FE \--\>|Code Review?| Orch;  
        BE \--\>|Code Review?| Orch;  
        Orch \--\>|Code Review?| HITL;  
        HITL \--\>|Code OK| Orch;  
        Orch \--\>|Merges Code| Tools;  
        Orch \--\>|Assign QA Task| QA(QA\_Tester);  
        QA \--\>|Queries CKG| Tools;  
        QA \--\>|Executes Tests| Orch;  
        QA \--\>|Reports Status/Bugs| CKG;  
        QA \--\>|QA Sign-off?| Orch;  
        Orch \--\>|QA Sign-off?| HITL;  
        HITL \--\>|QA OK| Orch;  
        Orch \--\>|Final Approval?| PL;  
        PL \--\>|Final OK| Orch;  
        Orch \--\>|Updates Project Status| Project;  
        Orch \--\>|Report Completion| User;  
    end

    %% Agent Resource Management (Conceptual)  
    Orch \--\>|Manage Resources| Orch;  
    Orch \--\>|Request Scale Up?| HITL;  
    HITL \--\>|Scale OK| Orch;  
    Orch \-- Spawns \--\> FE;  
    Orch \-- Spawns \--\> BE;  
    Orch \-- Spawns \--\> QA;  
    Orch \-- Terminates \--\> FE;

    %% Tools interact with CKG  
    Tools \--\> CKG;

## **3\. Environment Setup Requirements**

(Remains the same as v5)

## **4\. Agent Configuration & Initialization Specifications**

*(Instructions for the setup process/LLM)*

### **4.1. Orchestrator Agent (Orchestrator)**

* **Initialization:** As before.  
* **Core Logic Specification:**  
  * Task Lifecycle State Machine: Manage states for all task levels.  
  * JIT Decomposition Trigger: Monitor Tasks/Milestones marked active/ready.  
    * **Query CKG:** Use query\_ckg to find the applicable Workflow definition **by resolving scope** (Task \-\> Project \-\> Team \-\> Org \-\> Default).  
    * **Guided Decomposition:** Instruct LLM to decompose the task into SubTasks following the steps defined in the **resolved** Workflow. Generate metadata.  
    * Store plan in CKG. Trigger HITL Plan Review.  
  * Dependency Analysis & Parallelism: Use analyze\_task\_dependencies tool, cross-referencing with the **resolved** Workflow sequence.  
  * Task Assignment: Assign runnable SubTasks to Idle agents of the role specified in the WorkflowStep, passing the **resolved scope context** (e.g., applicable project ID, user ID).  
  * Agent Monitoring & Resource Management: As before.  
  * HITL Handling: As before.  
* **Required Tools Access:** As before.

### **4.2. Product Lead Agent (Product\_Lead)**

* **Initialization:** As before.  
* **Core Logic Specification:** Define Project/Milestone tasks. May associate specific Workflows **at the Project/Milestone scope** via update\_ckg. Review SubTask plans (generated according to resolved workflows). Review completed features/QA reports. Final approval.  
* **Required Tools Access:** query\_ckg, update\_ckg, trigger\_hitl\_alert.

### **4.3. Design Engineer Agent (Design\_Engineer)**

* **Initialization:** As before.  
* **Core Logic Specification:** Generate UI/UX specs linked to Tasks/Milestones. Review FE implementation via HITL. **Design rules/guidelines can be scoped and retrieved via query\_ckg.**  
* **Required Tools Access:** query\_ckg, update\_ckg, generate\_wireframe (opt), fetch\_design\_system\_component (opt), trigger\_hitl\_alert.

### **4.4. Backend Engineer Agent (Backend\_Engineer)**

* **Initialization:** As before.  
* **Core Logic Specification:** Execute assigned SubTask. **Call query\_ckg providing current context (user, project, task, sub-task ID) to retrieve the *effective* set of rules, persona details, workflow step instructions, and relevant code/project context after scope resolution.** Generate/validate code, execute commands, update context, signal completion.  
* **Required Tools Access:** As before.

### **4.5. Frontend Engineer Agent (Frontend\_Engineer)**

* **Initialization:** As before.  
* **Core Logic Specification:** Similar to BE Agent, executing assigned SubTask based on DE specs and **effective context/rules retrieved via query\_ckg for the current scope**.  
* **Required Tools Access:** As before.

### **4.6. QA Tester Agent (QA\_Tester)**

* **Initialization:** As before.  
* **Core Logic Specification:** Execute QA SubTasks as defined in the **resolved applicable Workflow**. Define/Execute test cases linked to Tasks/Milestones/SubTasks. Report results/bugs. Signal QA status via HITL.  
* **Required Tools Access:** As before.

## **5\. CKG / Enhanced Memory Bank Setup**

* **Initialization Script:**  
  * Initialize local graph DB (Dgraph/Neo4j).  
  * **Define CKG Schema:**  
    * **Unified Task Node:** Properties as before. Add scopeContext: JSON (e.g., {userId: '...', projectId: '...', teamId: '...'}).  
    * **Workflow Node:** Properties as before. **scope property is critical for override logic.**  
    * **WorkflowStep Node:** Properties as before.  
    * **Rule Node:**  
      * ruleId: string  
      * name: string (Used for override matching)  
      * description: string  
      * content: string (The rule text/logic)  
      * ruleType: Enum(...)  
      * scope: Enum("DEFAULT", "ORG", "TEAM", "PROJECT", "USER") **(Critical)**  
      * isActive: boolean  
    * **Persona Node:**  
      * personaId: string  
      * role: RoleEnum  
      * description: string  
      * promptTemplate: string  
      * scope: Enum("DEFAULT", "ORG", "TEAM", "PROJECT", "USER") **(Critical)**  
      * isActive: boolean  
    * **Hierarchy Nodes (Example):** Organization, Team, User.  
    * **Other Nodes:** File, Function, Class, AgentInstance, HITLInteraction, ProjectContext.  
    * **Relationships:**  
      * HAS\_SCOPE (Rule/Workflow/Persona \-\> Org/Team/Project/User) \- Or simply use the scope property.  
      * PART\_OF (User \-\> Team, Team \-\> Org) \- Defines the hierarchy for scope resolution.  
      * HAS\_PROJECT (Team/Org \-\> Project)  
      * (Other relationships as before: DEFINES\_WORKFLOW, HAS\_STEP, NEXT\_STEP, GUIDED\_BY\_STEP, CONTAINS, DECOMPOSED\_INTO, DEPENDS\_ON, ASSIGNED\_TO, IMPLEMENTS, CALLS, DOCUMENTS, SPECIFIED\_BY, TESTED\_BY, APPLIES\_TO, LOGS\_TO, REQUIRES\_HITL).  
    * Use Zod schemas internally for validation.  
  * Parse initial config file (Claude.md/warp\_init.yaml) containing **default** rules, personas, workflows. Populate corresponding nodes in CKG with scope: "DEFAULT". **Allow defining initial Project/Team/User scoped items as well.**  
  * Create /.warp\_memory/ directory.  
* **Initial Content:** Claude.md/warp\_init.yaml provides foundational **default** configurations and potentially some initial scoped overrides.

## **6\. Core Agent Toolkit Implementation**

*(Specify implementation details for conceptual tools)*

* **query\_ckg(query\_details: Dict) \-\> Dict:**  
  * **Input:** Dict including contextScope: {userId?, projectId?, teamId?, orgId?} and neededContext: List\[str\] (e.g., \['rules', 'workflow', 'persona', 'code\_snippets'\]). Other query parameters as needed.  
  * **Scope Resolution Logic (CRITICAL):**  
    1. Determine the hierarchy based on contextScope (e.g., User \-\> Project \-\> Team \-\> Org \-\> Default).  
    2. For each neededContext type (e.g., 'rules'):  
       * Query the CKG for active items (Rules, Workflows, Personas) matching the required type/name at the **most specific scope** (e.g., User scope first).  
       * If found, use that item.  
       * If not found, query the next level up the hierarchy (Project, then Team, etc.) until found or Default scope is reached.  
       * For items that should be *composed* (e.g., lists of best practices), retrieve items from *all* applicable scopes and merge them.  
  * **Output:** Dict containing the **resolved, effective** context (rules, workflow steps, persona details, code snippets etc.) applicable to the specific contextScope provided in the input.  
* **update\_ckg(payload: Dict) \-\> bool:**  
  * Logic: Ensure created/updated nodes (Rule, Workflow, Persona) have the correct scope property set based on the context.  
* **analyze\_task\_dependencies(parent\_task\_id: str) \-\> Dict:**  
  * Logic: Query CKG for SubTasks linked to parent\_task\_id. For each SubTask, check status of tasks in DEPENDS\_ON relationship **AND** status of SubTask(s) linked to the preceding WorkflowStep (via GUIDED\_BY\_STEP \-\> WorkflowStep \-\> NEXT\_STEP relationship on the resolved Workflow).  
* **(Implement other tools as before, ensuring they handle CKG interactions correctly).**

## **7\. HITL Interaction Mechanism (MVP)**

(Remains the same as v7 \- File-based signaling)

## **8\. Agent Resource Management Strategy (Implementation Detail)**

(Remains the same as v7 \- Orchestrator manages based on queues/parallelism/HITL)

## **9\. Initial PoC Task Example**

* **Setup:** As before. Additionally, populate CKG with:  
  * A DEFAULT scope Rule for commit messages.  
  * A PROJECT scope Rule overriding the commit message format specifically for this project.  
  * A DEFAULT scope Workflow for "Bug Fix".  
  * A PROJECT scope Workflow overriding the "Bug Fix" workflow with an extra mandatory security scan step.  
* **Goal:** Assign a "Bug Fix" Task within the project to Warp/Orchestrator.  
* **Expected Flow:** Orchestrator uses query\_ckg providing the project scope context. The tool resolves and returns the **Project-specific** "Bug Fix" workflow. Decomposition follows this workflow. When the BE agent needs Git rules, query\_ckg resolves and returns the **Project-specific** commit message rule, overriding the Default.
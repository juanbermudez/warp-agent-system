/**
 * Types and enums for the CKG Construction Module
 */

/**
 * Relationship types enum matching Dgraph predicates
 */
export enum RelationshipType {
  CONTAINS = 'contains',
  CALLS = 'calls',
  IMPORTS = 'imports',
  IMPLEMENTS = 'implements',
  EXTENDS = 'extends',
  DOCUMENTS = 'documents',
  RELATES_TO = 'relates_to',
  APPLIES_TO = 'applies_to',
  PARENT_TASK = 'parentTask',
  CHILD_TASKS = 'childTasks',
  DEPENDENCIES = 'dependencies',
  DEPENDED_ON_BY = 'dependedOnBy',
  GUIDED_BY_STEP = 'guidedByStep',
  TASKS_GUIDED_BY_THIS_STEP = 'tasksGuidedByThisStep',
  WORKFLOW = 'workflow', // WorkflowStep -> Workflow
  STEPS = 'steps', // Workflow -> WorkflowStep
  NEXT_STEP = 'nextStep', // WorkflowStep -> WorkflowStep
  PREVIOUS_STEP = 'previousStep', // WorkflowStep -> WorkflowStep
  FILE = 'file', // Function/Class -> File
  SCOPE_LINK = 'scopeLink', // Config -> Org/Team/Project/User
}

/**
 * Type for temporary relationship storage before UIDs are resolved
 */
export interface TempRelationship {
    sourceKey: string; // Unique key of source node (e.g., path, composite key)
    type: RelationshipType;
    targetKey: string; // Unique key of target node
}

/**
 * Configuration options for the Project Analyzer
 */
export interface ProjectAnalyzerConfig {
  dgraphEndpoint: string;
  openRouterApiKey?: string;
  openRouterBaseUrl?: string;
  llmExtractionModel?: string;
  contextFilePattern?: RegExp;
  configFileName?: string;
  contextDirName?: string;
  supportedCodeExtensions?: string[];
  treeSitterWasmPath?: string;
  maxFileSizeBytes?: number;
  llmTimeoutMs?: number;
  batchSizeNodes?: number;
  batchSizeRelationships?: number;
}

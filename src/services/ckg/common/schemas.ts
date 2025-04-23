/**
 * Zod schemas for CKG node validation
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base node schema with common properties
 */
export const BaseNodeSchema = z.object({
  uid: z.string().optional(), // Dgraph internal UID, do not set manually
  id: z.string().uuid().default(() => uuidv4()), // Application-level UUID, primary key for upserts
  'dgraph.type': z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string().datetime({ offset: true }).optional(), // Use ISO 8601 format
  modifiedAt: z.string().datetime({ offset: true }).optional(),
});

/**
 * File node schema
 */
export const FileNodeSchema = BaseNodeSchema.extend({
  'dgraph.type': z.literal('File'),
  path: z.string(), // Relative path from project root
  fileType: z.string().optional(),
  lastModified: z.string().datetime({ offset: true }).optional(),
});
export type FileNodeInput = z.infer<typeof FileNodeSchema>;

/**
 * Function node schema
 */
export const FunctionNodeSchema = BaseNodeSchema.extend({
  'dgraph.type': z.literal('Function'),
  name: z.string(),
  signature: z.string().optional(),
  filePath: z.string(), // Relative path for linking
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
});
export type FunctionNodeInput = z.infer<typeof FunctionNodeSchema>;

/**
 * Class node schema
 */
export const ClassNodeSchema = BaseNodeSchema.extend({
  'dgraph.type': z.literal('Class'),
  name: z.string(),
  filePath: z.string(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
});
export type ClassNodeInput = z.infer<typeof ClassNodeSchema>;

/**
 * Interface node schema
 */
export const InterfaceNodeSchema = BaseNodeSchema.extend({
  'dgraph.type': z.literal('Interface'),
  name: z.string(),
  filePath: z.string(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
});
export type InterfaceNodeInput = z.infer<typeof InterfaceNodeSchema>;

/**
 * Project context node schema
 */
export const ProjectContextNodeSchema = BaseNodeSchema.extend({
  'dgraph.type': z.literal('ProjectContext'),
  name: z.string(), // e.g., ADR title, Requirement ID
  filePath: z.string().optional(), // Path if extracted from a specific file
  contentType: z.string(), // e.g., 'ADR', 'REQUIREMENT', 'STANDARD', 'README_SECTION'
  content: z.string().optional(), // Full content or summary
});
export type ProjectContextNodeInput = z.infer<typeof ProjectContextNodeSchema>;

/**
 * Rule node schema
 */
export const RuleNodeSchema = BaseNodeSchema.extend({
  'dgraph.type': z.literal('Rule'),
  name: z.string(),
  ruleType: z.string(), // e.g., CODE_STANDARD, WORKFLOW
  content: z.string(),
  scope: z.string(), // DEFAULT, ORG, TEAM, PROJECT, USER
  isActive: z.boolean().default(true),
});
export type RuleNodeInput = z.infer<typeof RuleNodeSchema>;

/**
 * Persona node schema
 */
export const PersonaNodeSchema = BaseNodeSchema.extend({
  'dgraph.type': z.literal('Persona'),
  role: z.string(), // e.g., BACKEND_ENGINEER
  description: z.string(),
  promptTemplate: z.string(),
  scope: z.string(),
  isActive: z.boolean().default(true),
});
export type PersonaNodeInput = z.infer<typeof PersonaNodeSchema>;

/**
 * Workflow node schema
 */
export const WorkflowNodeSchema = BaseNodeSchema.extend({
  'dgraph.type': z.literal('Workflow'),
  name: z.string(),
  description: z.string().optional(),
  appliesToTaskType: z.string().optional(), // e.g., FEATURE_IMPLEMENTATION
  scope: z.string(),
  isActive: z.boolean().default(true),
  version: z.string().optional(),
});
export type WorkflowNodeInput = z.infer<typeof WorkflowNodeSchema>;

/**
 * Workflow step node schema
 */
export const WorkflowStepNodeSchema = BaseNodeSchema.extend({
  'dgraph.type': z.literal('WorkflowStep'),
  name: z.string(),
  description: z.string().optional(),
  stepOrder: z.number().int().positive(),
  requiredRole: z.string(), // AgentRole enum
  expectedSubTaskType: z.string(), // SubTaskType enum
  isOptional: z.boolean().optional().default(false),
});
export type WorkflowStepNodeInput = z.infer<typeof WorkflowStepNodeSchema>;

/**
 * Schema for LLM extraction responses
 */
export const LlmExtractionSchema = z.object({
  entities: z.array(z.object({
    id: z.string().describe("A unique identifier for this entity within the document (e.g., requirement ID, decision name). Use concise, readable IDs."),
    type: z.string().describe("The type of entity (e.g., Requirement, ArchDecision, Rule, Persona, Workflow, WorkflowStep, Standard, Guideline)."),
    name: z.string().optional().describe("A short name or title for the entity."),
    description: z.string().optional().describe("A concise description or the core content/summary of the entity."),
    scope: z.string().optional().describe("Scope (DEFAULT, ORG, TEAM, PROJECT, USER) if applicable (e.g., for Rule, Persona, Workflow). Default is PROJECT if not specified."),
    ruleType: z.string().optional().describe("Specific type if entity.type is Rule."),
    role: z.string().optional().describe("Specific role if entity.type is Persona."),
  })).optional(),
  relations: z.array(z.object({
    sourceEntityId: z.string().describe("ID (from entities above) of the source entity."),
    relationType: z.string().describe("Type of relationship (e.g., RELATES_TO, DEFINES, IMPLEMENTS_REQ, BASED_ON_DECISION, APPLIES_TO, CONTAINS_STEP). Use standard types where possible."),
    targetEntityId: z.string().optional().describe("ID (from entities above) of the target entity if internal to this document."),
    targetExternalRef: z.string().optional().describe("Reference to an external entity (e.g., function 'getUser', file 'src/auth.ts', rule 'CommitFormat', project 'WarpCore') if target is not defined above."),
  })).optional(),
});
export type LlmExtraction = z.infer<typeof LlmExtractionSchema>;

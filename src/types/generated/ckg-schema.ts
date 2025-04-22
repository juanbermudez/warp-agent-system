// GENERATED CODE - DO NOT MODIFY
// This file is generated from the GraphQL schema and will be overwritten
// To customize validation, use extension methods on these schemas

import { z } from 'zod';

// Scalar definitions
const dateTimeSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid DateTime format',
});

// Enum definitions
const taskStatusSchema = z.enum(['TODO', 'DECOMPOSING', 'AWAITING_PLAN_REVIEW', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'ERROR']);
type TaskStatus = z.infer<typeof taskStatusSchema>;

const subTaskTypeSchema = z.enum(['CODE', 'COMMAND', 'DESIGN', 'REVIEW', 'TEST']);
type SubTaskType = z.infer<typeof subTaskTypeSchema>;

const agentRoleSchema = z.enum(['ORCHESTRATOR', 'PRODUCT_LEAD', 'DESIGN_ENGINEER', 'FRONTEND_ENGINEER', 'BACKEND_ENGINEER', 'QA_TESTER']);
type AgentRole = z.infer<typeof agentRoleSchema>;

const agentStatusSchema = z.enum(['IDLE', 'BUSY', 'ERROR', 'TERMINATED']);
type AgentStatus = z.infer<typeof agentStatusSchema>;

const ruleTypeSchema = z.enum(['CODE_STANDARD', 'ARCHITECTURE', 'NAMING_CONVENTION', 'SECURITY', 'TESTING', 'WORKFLOW']);
type RuleType = z.infer<typeof ruleTypeSchema>;

const requirementStatusSchema = z.enum(['DRAFT', 'APPROVED', 'IMPLEMENTED', 'VERIFIED']);
type RequirementStatus = z.infer<typeof requirementStatusSchema>;

const testStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED']);
type TestStatus = z.infer<typeof testStatusSchema>;

const bugSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
type BugSeverity = z.infer<typeof bugSeveritySchema>;

const bugStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'WONT_FIX']);
type BugStatus = z.infer<typeof bugStatusSchema>;

const codeChangeStatusSchema = z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'MERGED']);
type CodeChangeStatus = z.infer<typeof codeChangeStatusSchema>;

const hITLTypeSchema = z.enum(['PLAN_REVIEW', 'COMMAND_APPROVAL', 'CODE_REVIEW', 'QA_SIGNOFF', 'FINAL_APPROVAL']);
type HITLType = z.infer<typeof hITLTypeSchema>;

const hITLStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'TIMED_OUT']);
type HITLStatus = z.infer<typeof hITLStatusSchema>;

// Type definitions
const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  rootPath: z.string().optional(),
  createdAt: dateTimeSchema.optional(),
  tasks: z.array(z.any()).optional(),
  rules: z.array(z.any()).optional(),
  personas: z.array(z.any()).optional(),
});
type Project = z.infer<typeof projectSchema>;

const taskSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: taskStatusSchema.optional(),
  priority: z.number().int().optional(),
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional(),
  project: projectSchema.optional(),
  subTasks: z.array(z.any()).optional(),
  requirements: z.array(z.any()).optional(),
  designSpecs: z.array(z.any()).optional(),
  assignedTo: z.any().optional(),
});
type Task = z.infer<typeof taskSchema>;

const subTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: taskStatusSchema.optional(),
  type: subTaskTypeSchema.optional(),
  parentTask: taskSchema.optional(),
  dependencies: z.array(z.any()).optional(),
  assignedRole: agentRoleSchema.optional(),
  assignedTo: z.any().optional(),
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional(),
  ckgLinks: z.array(z.string()).optional(),
  commandDetails: z.string().optional(),
  codeChanges: z.array(z.any()).optional(),
});
type SubTask = z.infer<typeof subTaskSchema>;

const agentInstanceSchema = z.object({
  id: z.string().optional(),
  role: agentRoleSchema.optional(),
  status: agentStatusSchema.optional(),
  contextSize: z.number().int().optional(),
  createdAt: dateTimeSchema.optional(),
  lastActiveAt: dateTimeSchema.optional(),
  handledTasks: z.array(z.any()).optional(),
  activeContext: z.string().optional(),
});
type AgentInstance = z.infer<typeof agentInstanceSchema>;

const ruleSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  ruleType: ruleTypeSchema.optional(),
  content: z.string().optional(),
  appliesTo: z.array(z.any()).optional(),
  appliesForRoles: z.array(agentRoleSchema).optional(),
});
type Rule = z.infer<typeof ruleSchema>;

const personaSchema = z.object({
  id: z.string().optional(),
  role: agentRoleSchema.optional(),
  description: z.string().optional(),
  promptTemplate: z.string().optional(),
  project: projectSchema.optional(),
});
type Persona = z.infer<typeof personaSchema>;

const requirementSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  task: taskSchema.optional(),
  priority: z.number().int().optional(),
  status: requirementStatusSchema.optional(),
});
type Requirement = z.infer<typeof requirementSchema>;

const designSpecSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  task: taskSchema.optional(),
  createdAt: dateTimeSchema.optional(),
  updatedAt: dateTimeSchema.optional(),
  approvedAt: dateTimeSchema.optional(),
  approvedBy: z.string().optional(),
});
type DesignSpec = z.infer<typeof designSpecSchema>;

const archDecisionSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  rationale: z.string().optional(),
  alternatives: z.string().optional(),
  createdAt: dateTimeSchema.optional(),
  task: taskSchema.optional(),
});
type ArchDecision = z.infer<typeof archDecisionSchema>;

const fileSchema = z.object({
  id: z.string().optional(),
  path: z.string().optional(),
  content: z.string().optional(),
  fileType: z.string().optional(),
  lastModified: dateTimeSchema.optional(),
  functions: z.array(z.any()).optional(),
  classes: z.array(z.any()).optional(),
  interfaces: z.array(z.any()).optional(),
});
type File = z.infer<typeof fileSchema>;

const functionSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  signature: z.string().optional(),
  description: z.string().optional(),
  file: fileSchema.optional(),
  calls: z.array(z.any()).optional(),
  calledBy: z.array(z.any()).optional(),
});
type Function = z.infer<typeof functionSchema>;

const classSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  file: fileSchema.optional(),
  implements: z.array(z.any()).optional(),
  methods: z.array(z.any()).optional(),
});
type Class = z.infer<typeof classSchema>;

const interfaceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  file: fileSchema.optional(),
  implementedBy: z.array(z.any()).optional(),
});
type Interface = z.infer<typeof interfaceSchema>;

const testPlanSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  task: taskSchema.optional(),
  testCases: z.array(z.any()).optional(),
});
type TestPlan = z.infer<typeof testPlanSchema>;

const testCaseSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  steps: z.string().optional(),
  expectedResult: z.string().optional(),
  testPlan: testPlanSchema.optional(),
  status: testStatusSchema.optional(),
  bugReports: z.array(z.any()).optional(),
});
type TestCase = z.infer<typeof testCaseSchema>;

const bugReportSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  severity: bugSeveritySchema.optional(),
  status: bugStatusSchema.optional(),
  testCase: testCaseSchema.optional(),
  createdAt: dateTimeSchema.optional(),
  resolvedAt: dateTimeSchema.optional(),
  assignedTo: agentInstanceSchema.optional(),
});
type BugReport = z.infer<typeof bugReportSchema>;

const codeChangeSchema = z.object({
  id: z.string().optional(),
  path: z.string().optional(),
  diff: z.string().optional(),
  description: z.string().optional(),
  subTask: subTaskSchema.optional(),
  createdAt: dateTimeSchema.optional(),
  status: codeChangeStatusSchema.optional(),
});
type CodeChange = z.infer<typeof codeChangeSchema>;

const hITLInteractionSchema = z.object({
  id: z.string().optional(),
  type: hITLTypeSchema.optional(),
  message: z.string().optional(),
  metadata: z.string().optional(),
  status: hITLStatusSchema.optional(),
  createdAt: dateTimeSchema.optional(),
  respondedAt: dateTimeSchema.optional(),
  relatedTask: taskSchema.optional(),
  relatedSubTask: subTaskSchema.optional(),
});
type HITLInteraction = z.infer<typeof hITLInteractionSchema>;

// Export all schemas
export {
  projectSchema,
  Project,
  taskSchema,
  Task,
  subTaskSchema,
  SubTask,
  agentInstanceSchema,
  AgentInstance,
  ruleSchema,
  Rule,
  personaSchema,
  Persona,
  requirementSchema,
  Requirement,
  designSpecSchema,
  DesignSpec,
  archDecisionSchema,
  ArchDecision,
  fileSchema,
  File,
  functionSchema,
  Function,
  classSchema,
  Class,
  interfaceSchema,
  Interface,
  testPlanSchema,
  TestPlan,
  testCaseSchema,
  TestCase,
  bugReportSchema,
  BugReport,
  codeChangeSchema,
  CodeChange,
  hITLInteractionSchema,
  HITLInteraction,
  taskStatusSchema,
  TaskStatus,
  subTaskTypeSchema,
  SubTaskType,
  agentRoleSchema,
  AgentRole,
  agentStatusSchema,
  AgentStatus,
  ruleTypeSchema,
  RuleType,
  requirementStatusSchema,
  RequirementStatus,
  testStatusSchema,
  TestStatus,
  bugSeveritySchema,
  BugSeverity,
  bugStatusSchema,
  BugStatus,
  codeChangeStatusSchema,
  CodeChangeStatus,
  hITLTypeSchema,
  HITLType,
  hITLStatusSchema,
  HITLStatus,
  dateTimeSchema,
};

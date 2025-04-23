// Task Status Management Schema Types
// This file contains TypeScript schema definitions for the status management enhancement

import { z } from 'zod';
import { dateTimeSchema, taskStatusSchema, ScopeLevel, scopeLevelSchema, Project, projectSchema } from './ckg-schema';

// Enhanced Task Status Entity Schema
const taskStatusEntitySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  category: z.string().optional(),
  isDefault: z.boolean().optional(),
  allowedTransitionsTo: z.array(z.lazy(() => taskStatusEntitySchema)).optional(),
  allowedTransitionsFrom: z.array(z.lazy(() => taskStatusEntitySchema)).optional(),
  scope: scopeLevelSchema,
  scopeEntityId: z.string().optional(),
  isActive: z.boolean(),
  createdAt: dateTimeSchema.optional(),
  modifiedAt: dateTimeSchema.optional(),
  appliesTo: z.array(projectSchema).optional(),
});
type TaskStatusEntity = z.infer<typeof taskStatusEntitySchema>;

// Enhanced Task Schema with status entity references
const taskEnhancedSchema = z.object({
  statusEntity: taskStatusEntitySchema.optional(),
  workflowStage: z.string().optional(),
  stageColor: z.string().optional(),
  stageCategory: z.string().optional(),
});
type TaskEnhanced = z.infer<typeof taskEnhancedSchema>;

// Enhanced WorkflowStep Schema
const workflowStepEnhancedSchema = z.object({
  requiredStatus: taskStatusEntitySchema.optional(),
  resultingStatus: taskStatusEntitySchema.optional(),
});
type WorkflowStepEnhanced = z.infer<typeof workflowStepEnhancedSchema>;

export {
  taskStatusEntitySchema,
  TaskStatusEntity,
  taskEnhancedSchema,
  TaskEnhanced,
  workflowStepEnhancedSchema,
  WorkflowStepEnhanced
};

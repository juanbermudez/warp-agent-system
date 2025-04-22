// src/db/schema/schema-types.ts
import { z } from 'zod';

// Schema initialization options
export const schemaInitOptionsSchema = z.object({
  schemaPath: z.string(),
  dgraphAddress: z.string().optional(),
  dropAll: z.boolean().default(false),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  generateZod: z.boolean().default(true),
});

export type SchemaInitOptions = z.infer<typeof schemaInitOptionsSchema>;

// Schema check result
export interface SchemaCheckResult {
  exists: boolean;
  currentSchema?: string;
  needsUpdate: boolean;
  differences?: string[];
}

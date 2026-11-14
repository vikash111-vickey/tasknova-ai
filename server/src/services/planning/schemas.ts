import { z } from 'zod';

export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const IntentAnalysisSchema = z.object({
  objective: z.string().min(1, 'Objective is required'),
  requested_actions: z.array(z.string()).default([]),
  target_apps: z.array(z.string()).default([]),
  required_data: z.array(z.string()).default([]),
  expected_output: z.string().default(''),
  time_constraints: z.string().default('none'),
  missing_information: z.array(z.string()).default([]),
  clarifying_questions: z.array(z.string()).default([]),
  risk_summary: z.string().default(''),
  can_proceed: z.boolean().default(true),
});

export type IntentAnalysis = z.infer<typeof IntentAnalysisSchema>;

export const ExecutionStepSchema = z.object({
  id: z.string().min(1, 'Step ID is required'),
  name: z.string().min(1, 'Step name is required'),
  tool: z.string().min(1, 'Tool name is required'),
  action: z.string().min(1, 'Action name is required'),
  input: z.record(z.unknown()).default({}),
  depends_on: z.array(z.string()).default([]),
  requires_approval: z.boolean().default(false),
  risk_level: RiskLevelSchema.default('low'),
  expected_output: z.string().default(''),
  verification_method: z.string().default('schema_validation'),
  reason: z.string().min(1, 'One line reason is required'),
  estimated_seconds: z.number().int().nonnegative().default(10),
  idempotent: z.boolean().default(true),
});

export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;

export const ExecutionPlanSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  objective: z.string().min(1, 'Objective is required'),
  preserved_original_instruction: z.string().min(1, 'Original instruction must be preserved'),
  steps: z.array(ExecutionStepSchema).min(1, 'Plan must contain at least one step'),
  estimated_total_seconds: z.number().int().nonnegative().default(30),
  risk_level: RiskLevelSchema.default('low'),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export const UnderstandRequestSchema = z.object({
  instruction: z.string().min(2, 'Instruction is required'),
});

export const GeneratePlanRequestSchema = z.object({
  instruction: z.string().min(2, 'Instruction is required'),
  clarifications: z.record(z.string()).optional(),
  taskId: z.string().uuid().optional(),
});

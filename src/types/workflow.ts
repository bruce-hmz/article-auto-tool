import { z } from 'zod';

// Workflow modes
export const WorkflowModeSchema = z.enum(['key_checkpoint', 'auto', 'step_by_step']);
export type WorkflowMode = z.infer<typeof WorkflowModeSchema>;

// Step status
export const StepStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'skipped', 'failed']);
export type StepStatus = z.infer<typeof StepStatusSchema>;

// Step definition
export interface Step {
  id: number;
  name: string;
  description: string;
  isKeyCheckpoint: boolean; // Whether this step requires user confirmation in key_checkpoint mode
  execute(context: WorkflowContext): Promise<StepResult>;
  validate?(input: unknown): Promise<boolean>;
}

// Step result
export interface StepResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresUserAction?: boolean;
  skipToStep?: number; // Jump to a specific step
}

// Workflow context
export interface WorkflowContext {
  workflowId: string;
  mode: WorkflowMode;
  currentStep: number;
  accountId?: string;
  outputPath: string;
  metadata: Record<string, unknown>;
  stepResults: Map<number, StepResult>;
}

// Workflow state for persistence
export interface WorkflowState {
  workflowId: string;
  mode: WorkflowMode;
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentStep: number;
  accountId?: string;
  outputPath: string;
  startedAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  stepResults: Record<number, {
    status: StepStatus;
    data?: unknown;
    error?: string;
    completedAt?: string;
  }>;
}

// Step configuration
export interface StepConfig {
  skip?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

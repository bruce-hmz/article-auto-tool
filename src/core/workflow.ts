import { logger } from '../utils/logger';
import { StateManager } from './state-manager';
import { StepManager } from './step-manager';
import type {
  Step,
  WorkflowMode,
  WorkflowContext,
  WorkflowState,
  StepResult,
} from '../types';
import { promptConfirm } from '../utils/prompts';

export class WorkflowEngine {
  private stateManager: StateManager;
  private stepManager: StepManager;
  private currentWorkflow?: WorkflowState;
  private context?: WorkflowContext;

  constructor(stateManager: StateManager, stepManager: StepManager) {
    this.stateManager = stateManager;
    this.stepManager = stepManager;
  }

  async start(
    mode: WorkflowMode,
    accountId?: string,
    resumeWorkflowId?: string
  ): Promise<void> {
    // Initialize state manager
    await this.stateManager.initialize();

    // Create or resume workflow
    if (resumeWorkflowId) {
      this.currentWorkflow = await this.stateManager.load(resumeWorkflowId) ?? undefined;
      if (!this.currentWorkflow) {
        throw new Error(`Workflow ${resumeWorkflowId} not found`);
      }
      logger.info(`Resumed workflow: ${resumeWorkflowId}`);
    } else {
      this.currentWorkflow = await this.stateManager.createWorkflow(mode, accountId);
      logger.info(`Created new workflow: ${this.currentWorkflow.workflowId}`);
    }

    // Initialize context
    this.context = {
      workflowId: this.currentWorkflow.workflowId,
      mode: this.currentWorkflow.mode,
      currentStep: this.currentWorkflow.currentStep,
      accountId: this.currentWorkflow.accountId,
      outputPath: this.currentWorkflow.outputPath,
      metadata: this.currentWorkflow.metadata,
      stepResults: new Map(
        Object.entries(this.currentWorkflow.stepResults).map(([k, v]) => [
          parseInt(k),
          {
            success: v.status === 'completed',
            data: v.data,
            error: v.error,
          } as StepResult,
        ])
      ),
    };

    // Execute workflow
    await this.executeWorkflow();
  }

  private async executeWorkflow(): Promise<void> {
    if (!this.currentWorkflow || !this.context) {
      throw new Error('Workflow not initialized');
    }

    const steps = this.stepManager.getAll();
    const startIndex = this.currentWorkflow.currentStep;

    logger.info(`Starting workflow from step ${startIndex}`);
    logger.info(`Mode: ${this.currentWorkflow.mode}`);

    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i];

      logger.step(step.id, step.name);
      this.currentWorkflow.currentStep = step.id;

      // Check if step is already completed
      const existingResult = this.currentWorkflow.stepResults[step.id];
      if (existingResult?.status === 'completed') {
        logger.info(`Step ${step.id} already completed, skipping...`);
        continue;
      }

      // Mark step as in progress
      await this.stateManager.updateStep(
        this.currentWorkflow.workflowId,
        step.id,
        'in_progress'
      );

      // Execute step
      const result = await this.stepManager.executeStep(step.id, this.context);
      this.context.stepResults.set(step.id, result);

      // Handle result
      if (!result.success) {
        logger.error(`Step ${step.id} failed: ${result.error}`);
        await this.stateManager.updateStep(
          this.currentWorkflow.workflowId,
          step.id,
          'failed',
          result.data,
          result.error
        );

        this.currentWorkflow.status = 'failed';
        await this.stateManager.save(this.currentWorkflow);

        throw new Error(`Workflow failed at step ${step.id}: ${result.error}`);
      }

      // Save step result
      await this.stateManager.updateStep(
        this.currentWorkflow.workflowId,
        step.id,
        'completed',
        result.data
      );

      // Check if user action is required
      if (result.requiresUserAction) {
        const shouldContinue = await promptConfirm(
          'Step requires user action. Continue to next step?'
        );
        if (!shouldContinue) {
          logger.info('Workflow paused by user');
          this.currentWorkflow.status = 'paused';
          await this.stateManager.save(this.currentWorkflow);
          return;
        }
      }

      // In key_checkpoint mode, pause at key checkpoints
      if (
        this.currentWorkflow.mode === 'key_checkpoint' &&
        step.isKeyCheckpoint &&
        i < steps.length - 1
      ) {
        const shouldContinue = await promptConfirm(
          'Key checkpoint reached. Continue to next step?'
        );
        if (!shouldContinue) {
          logger.info('Workflow paused at key checkpoint');
          this.currentWorkflow.status = 'paused';
          await this.stateManager.save(this.currentWorkflow);
          return;
        }
      }

      // In step_by_step mode, pause after every step
      if (
        this.currentWorkflow.mode === 'step_by_step' &&
        i < steps.length - 1
      ) {
        const shouldContinue = await promptConfirm(
          'Continue to next step?'
        );
        if (!shouldContinue) {
          logger.info('Workflow paused by user');
          this.currentWorkflow.status = 'paused';
          await this.stateManager.save(this.currentWorkflow);
          return;
        }
      }

      // Jump to specific step if requested
      if (result.skipToStep !== undefined) {
        const targetStep = this.stepManager.get(result.skipToStep);
        if (targetStep) {
          i = result.skipToStep - 1; // -1 because loop will increment
          logger.info(`Jumping to step ${result.skipToStep}`);
        }
      }
    }

    // Workflow completed
    logger.success('Workflow completed successfully!');
    this.currentWorkflow.status = 'completed';
    await this.stateManager.save(this.currentWorkflow);
  }

  async getStatus(): Promise<WorkflowState | null> {
    if (!this.currentWorkflow) {
      return null;
    }
    return await this.stateManager.load(this.currentWorkflow.workflowId);
  }

  async listWorkflows(): Promise<Array<{ id: string; status: string; startedAt: string }>> {
    return await this.stateManager.listWorkflows();
  }
}

export default WorkflowEngine;

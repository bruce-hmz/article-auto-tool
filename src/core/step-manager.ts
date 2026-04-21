import type { Step, WorkflowContext, StepResult } from '../types';

export class StepManager {
  private steps: Map<number, Step> = new Map();

  register(step: Step): void {
    this.steps.set(step.id, step);
  }

  get(stepId: number): Step | undefined {
    return this.steps.get(stepId);
  }

  getAll(): Step[] {
    return Array.from(this.steps.values()).sort((a, b) => a.id - b.id);
  }

  getNextStep(currentStep: number): Step | undefined {
    const allSteps = this.getAll();
    return allSteps.find(step => step.id > currentStep);
  }

  getPreviousStep(currentStep: number): Step | undefined {
    const allSteps = this.getAll();
    const reversed = [...allSteps].reverse();
    return reversed.find(step => step.id < currentStep);
  }

  getKeyCheckpoints(): Step[] {
    return this.getAll().filter(step => step.isKeyCheckpoint);
  }

  async executeStep(
    stepId: number,
    context: WorkflowContext
  ): Promise<StepResult> {
    const step = this.get(stepId);
    if (!step) {
      return {
        success: false,
        error: `Step ${stepId} not found`,
      };
    }

    try {
      const result = await step.execute(context);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getTotalSteps(): number {
    return this.steps.size;
  }
}

export default StepManager;

import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileManager } from '../utils/file-manager';
import { logger } from '../utils/logger';
import type { WorkflowState, WorkflowMode, StepStatus } from '../types';

export class StateManager {
  private stateDir: string;

  constructor(stateDir: string = '.workflow-states') {
    this.stateDir = stateDir;
  }

  async initialize(): Promise<void> {
    await FileManager.ensureDir(this.stateDir);
  }

  async createWorkflow(
    mode: WorkflowMode,
    accountId?: string,
    outputPath?: string
  ): Promise<WorkflowState> {
    const workflowId = uuidv4();
    const now = new Date().toISOString();

    const state: WorkflowState = {
      workflowId,
      mode,
      status: 'running',
      currentStep: 0,
      accountId,
      // Defer output path: if accountId is known now, include it.
      // If not, Step 1 will call updateOutputPath() after account selection.
      outputPath: outputPath || this.generateOutputPath(accountId),
      startedAt: now,
      updatedAt: now,
      metadata: {},
      stepResults: {},
    };

    await this.save(state);
    logger.debug(`Created workflow: ${workflowId}`);
    return state;
  }

  async save(state: WorkflowState): Promise<void> {
    state.updatedAt = new Date().toISOString();
    const filePath = this.getStatePath(state.workflowId);
    await FileManager.writeJSON(filePath, state);
    logger.debug(`Saved workflow state: ${state.workflowId}`);
  }

  async load(workflowId: string): Promise<WorkflowState | null> {
    const filePath = this.getStatePath(workflowId);
    const exists = await FileManager.exists(filePath);

    if (!exists) {
      return null;
    }

    return await FileManager.readJSON<WorkflowState>(filePath);
  }

  async updateStep(
    workflowId: string,
    stepNumber: number,
    status: StepStatus,
    data?: unknown,
    error?: string
  ): Promise<void> {
    const state = await this.load(workflowId);
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    state.stepResults[stepNumber] = {
      status,
      data,
      error,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    };

    if (status === 'completed') {
      state.currentStep = stepNumber + 1;
    }

    await this.save(state);
  }

  async listWorkflows(): Promise<Array<{ id: string; status: string; startedAt: string }>> {
    const files = await FileManager.listFiles(this.stateDir, /\.json$/);
    const workflows: Array<{ id: string; status: string; startedAt: string }> = [];

    for (const file of files) {
      try {
        const state = await FileManager.readJSON<WorkflowState>(file);
        workflows.push({
          id: state.workflowId,
          status: state.status,
          startedAt: state.startedAt,
        });
      } catch (error) {
        logger.warn(`Failed to read workflow state: ${file}`);
      }
    }

    return workflows.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  async cleanup(olderThanDays: number = 7): Promise<number> {
    const files = await FileManager.listFiles(this.stateDir, /\.json$/);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let deleted = 0;
    for (const file of files) {
      try {
        const state = await FileManager.readJSON<WorkflowState>(file);
        if (new Date(state.updatedAt) < cutoff) {
          await FileManager.delete(file);
          deleted++;
        }
      } catch (error) {
        logger.warn(`Failed to cleanup workflow state: ${file}`);
      }
    }

    logger.info(`Cleaned up ${deleted} old workflow states`);
    return deleted;
  }

  private getStatePath(workflowId: string): string {
    return path.join(this.stateDir, `${workflowId}.json`);
  }

  /**
   * Update the output path after accountId becomes available (e.g., after Step 1).
   * Also updates the path on disk if state files have already been written.
   */
  async updateOutputPath(workflowId: string, accountId: string): Promise<void> {
    const state = await this.load(workflowId);
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    state.accountId = accountId;
    state.outputPath = this.generateOutputPath(accountId);
    await this.save(state);
    logger.debug(`Updated output path for ${workflowId}: ${state.outputPath}`);
  }

  private generateOutputPath(accountId?: string): string {
    const today = new Date().toISOString().split('T')[0];
    if (accountId) {
      return path.join('output', accountId, today);
    }
    return path.join('output', today);
  }
}

export default StateManager;

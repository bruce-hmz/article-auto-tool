import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { FileManager } from '../file-manager'
import type { WorkflowState, WorkflowMode, StepStatus } from '../types'
import { STEPS } from '../constants'

// Re-export STEPS for convenience
export { STEPS }

// Get the project root directory (parent of web/)
const PROJECT_ROOT = path.resolve(process.cwd(), '..')

export class WorkflowService {
  private stateDir: string

  constructor() {
    this.stateDir = path.join(PROJECT_ROOT, '.workflow-states')
  }

  async initialize(): Promise<void> {
    await FileManager.ensureDir(this.stateDir)
  }

  async createWorkflow(
    mode: WorkflowMode,
    accountId?: string,
    outputPath?: string
  ): Promise<WorkflowState> {
    await this.initialize()

    const workflowId = uuidv4()
    const now = new Date().toISOString()

    const state: WorkflowState = {
      workflowId,
      mode,
      status: 'running',
      currentStep: 0,
      accountId,
      outputPath: outputPath || this.generateOutputPath(),
      startedAt: now,
      updatedAt: now,
      metadata: {},
      stepResults: {},
    }

    await this.save(state)
    return state
  }

  async save(state: WorkflowState): Promise<void> {
    state.updatedAt = new Date().toISOString()
    const filePath = this.getStatePath(state.workflowId)
    await FileManager.writeJSON(filePath, state)
  }

  async load(workflowId: string): Promise<WorkflowState | null> {
    const filePath = this.getStatePath(workflowId)
    const exists = await FileManager.exists(filePath)

    if (!exists) {
      return null
    }

    return await FileManager.readJSON<WorkflowState>(filePath)
  }

  async updateStep(
    workflowId: string,
    stepNumber: number,
    status: StepStatus,
    data?: unknown,
    error?: string
  ): Promise<void> {
    const state = await this.load(workflowId)
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    state.stepResults[stepNumber] = {
      status,
      data,
      error,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    }

    if (status === 'completed') {
      state.currentStep = stepNumber + 1
    }

    await this.save(state)
  }

  async updateStatus(
    workflowId: string,
    status: WorkflowState['status']
  ): Promise<void> {
    const state = await this.load(workflowId)
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    state.status = status
    await this.save(state)
  }

  async delete(workflowId: string): Promise<void> {
    const filePath = this.getStatePath(workflowId)
    await FileManager.delete(filePath)
  }

  async listWorkflows(): Promise<WorkflowState[]> {
    await this.initialize()
    const files = await FileManager.listFiles(this.stateDir, /\.json$/)
    const workflows: WorkflowState[] = []

    for (const file of files) {
      try {
        const state = await FileManager.readJSON<WorkflowState>(file)
        workflows.push(state)
      } catch (error) {
        console.error(`Failed to read workflow state: ${file}`)
      }
    }

    return workflows.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )
  }

  async getStats(): Promise<{
    total: number
    running: number
    paused: number
    completed: number
    failed: number
  }> {
    const workflows = await this.listWorkflows()
    return {
      total: workflows.length,
      running: workflows.filter(w => w.status === 'running').length,
      paused: workflows.filter(w => w.status === 'paused').length,
      completed: workflows.filter(w => w.status === 'completed').length,
      failed: workflows.filter(w => w.status === 'failed').length,
    }
  }

  private getStatePath(workflowId: string): string {
    return path.join(this.stateDir, `${workflowId}.json`)
  }

  private generateOutputPath(): string {
    const today = new Date().toISOString().split('T')[0]
    return path.join('output', today)
  }
}

export const workflowService = new WorkflowService()

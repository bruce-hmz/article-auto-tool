// Workflow types
export type WorkflowMode = 'key_checkpoint' | 'auto' | 'step_by_step'
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
export type WorkflowStatus = 'running' | 'paused' | 'completed' | 'failed'

export interface WorkflowState {
  workflowId: string
  mode: WorkflowMode
  status: WorkflowStatus
  currentStep: number
  accountId?: string
  outputPath: string
  startedAt: string
  updatedAt: string
  metadata: Record<string, unknown>
  stepResults: Record<number, {
    status: StepStatus
    data?: unknown
    error?: string
    completedAt?: string
  }>
}

export interface Step {
  id: number
  name: string
  description: string
  isKeyCheckpoint: boolean
}

// Account types
export interface AccountConfig {
  id: string
  name: string
  appId: string
  appSecret: string
  config?: {
    defaultTheme?: string
    imageStyle?: string
    publishing?: {
      defaultAuthor?: string
      autoPublish?: boolean
    }
  }
}

// Staging types
export interface StagingData {
  workflowId: string
  accountId: string
  createdAt: string
  updatedAt: string
  article: {
    title: string
    topic?: string
  }
  publishStatus: 'pending' | 'success' | 'failed'
  publishError?: string
  retryCount: number
}

export interface StagingListItem {
  workflowId: string
  accountId: string
  title: string
  status: string
  retryCount: number
  createdAt: string
  updatedAt: string
}

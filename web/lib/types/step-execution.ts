/**
 * Step Execution Types for Web Workflow Execution
 *
 * These types support the event-driven + pause/resume architecture
 * for executing workflow steps in the web interface.
 */

// Interaction types that steps can request
export type InteractionType =
  | 'select'      // Single selection from options
  | 'input'       // Text input
  | 'confirm'     // Yes/No confirmation
  | 'multiselect' // Multiple selection from options
  | 'none'        // No interaction needed

// Choice option for select/multiselect
export interface ChoiceOption {
  value: string
  label: string
  description?: string
}

// Interaction request (returned to frontend when step pauses)
export interface InteractionRequest {
  type: InteractionType
  message: string
  stepId: number
  stepName: string
  options?: {
    choices?: ChoiceOption[]
    defaultValue?: string | boolean | string[]
    placeholder?: string
    validate?: (value: string) => boolean | string
  }
}

// User input submission
export interface UserInput {
  type: InteractionType
  value: string | boolean | string[]
  stepId: number
}

// Execution event types for SSE
export type ExecutionEventType =
  | 'started'    // Workflow started
  | 'progress'   // Step progress update
  | 'log'        // Log message
  | 'waiting'    // Waiting for user input
  | 'input'      // User input received
  | 'completed'  // Step completed
  | 'error'      // Error occurred
  | 'finished'   // Workflow finished

// Execution event (SSE push)
export interface ExecutionEvent {
  type: ExecutionEventType
  timestamp: string
  data: {
    stepId?: number
    stepName?: string
    message?: string
    interaction?: InteractionRequest
    error?: string
    result?: unknown
    progress?: {
      current: number
      total: number
    }
  }
}

// Step execution result
export interface StepExecutionResult {
  success: boolean
  data?: unknown
  error?: string
  requiresInteraction?: boolean
  interaction?: InteractionRequest
  skipToStep?: number
}

// Execution state
export type ExecutionStatus = 'idle' | 'running' | 'waiting' | 'paused' | 'completed' | 'failed'

// Execution session state (stored in memory)
export interface ExecutionSession {
  workflowId: string
  status: ExecutionStatus
  currentStep: number
  pendingInteraction?: InteractionRequest
  events: ExecutionEvent[]
  startedAt: string
  updatedAt: string
}

// Step handler interface
export interface StepHandler {
  id: number
  name: string
  description: string
  isKeyCheckpoint: boolean
  execute(
    context: WebExecutionContext,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult>
}

// Web execution context
export interface WebExecutionContext {
  workflowId: string
  mode: 'auto' | 'key_checkpoint' | 'step_by_step'
  currentStep: number
  accountId?: string
  userId?: string
  outputPath: string
  metadata: WorkflowMetadata
  stepResults: Map<number, StepExecutionResult>
  userInput?: UserInput
}

// Workflow metadata types
export interface TopicIdea {
  title: string
  description: string
}

export interface Article {
  title: string
  content: string
  author?: string
}

export interface FormattedArticle {
  title: string
  content: string
  html?: string
  wordCount: number
  readingTime: number
  author?: string
  digest?: string
}

export interface GeneratedImage {
  path: string
  prompt: string
  mediaId?: string
  timestamp?: string
}

export interface Outline {
  title: string
  sections: Array<{ heading: string; points: string[] }>
  writingStyle: string
  tone: string
}

export interface ResearchMaterial {
  url?: string
  title?: string
  content: string
  relevance?: string
}

export interface WorkflowMetadata {
  selectedTopic?: TopicIdea
  generatedTopics?: TopicIdea[]
  article?: Article
  formattedArticle?: FormattedArticle
  coverImage?: GeneratedImage
  illustrations?: GeneratedImage[]
  outline?: Outline
  researchMaterials?: ResearchMaterial[]
  publishingInfo?: {
    title: string
    digest?: string
    wordCount?: number
    readingTime?: number
    hasCoverImage?: boolean
    illustrationsCount?: number
  }
  [key: string]: unknown
}

// SSE message format
export interface SSEMessage {
  event: ExecutionEventType
  data: string // JSON string of ExecutionEvent
}

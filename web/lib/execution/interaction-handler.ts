/**
 * Interaction Handler
 *
 * Manages step pause/resume and user input processing.
 * This is the core component for handling user interactions during workflow execution.
 */

import type {
  InteractionRequest,
  InteractionType,
  UserInput,
  ExecutionEvent,
  ChoiceOption,
} from '../types/step-execution'

export interface InteractionHandlerConfig {
  workflowId: string
  onEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
}

export class InteractionHandler {
  private workflowId: string
  private pendingInteraction: InteractionRequest | null = null
  private inputResolver: ((input: UserInput) => void) | null = null
  private onEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void

  constructor(config: InteractionHandlerConfig) {
    this.workflowId = config.workflowId
    this.onEvent = config.onEvent
  }

  /**
   * Request user interaction
   * Returns a promise that resolves when the user provides input
   */
  async requestInput(request: InteractionRequest): Promise<UserInput> {
    this.pendingInteraction = request

    // Emit waiting event
    this.onEvent({
      type: 'waiting',
      data: {
        stepId: request.stepId,
        stepName: request.stepName,
        message: request.message,
        interaction: request,
      },
    })

    // Return a promise that will be resolved when submitInput is called
    return new Promise((resolve) => {
      this.inputResolver = resolve
    })
  }

  /**
   * Submit user input (called from API when user responds)
   */
  submitInput(input: UserInput): boolean {
    if (!this.pendingInteraction || this.pendingInteraction.stepId !== input.stepId) {
      return false
    }

    if (this.inputResolver) {
      this.inputResolver(input)
      this.inputResolver = null
      this.pendingInteraction = null

      // Emit input received event
      this.onEvent({
        type: 'input',
        data: {
          stepId: input.stepId,
          message: `User input received: ${typeof input.value === 'boolean' ? (input.value ? 'Yes' : 'No') : String(input.value)}`,
        },
      })

      return true
    }

    return false
  }

  /**
   * Check if there's a pending interaction
   */
  hasPendingInteraction(): boolean {
    return this.pendingInteraction !== null
  }

  /**
   * Get the current pending interaction
   */
  getPendingInteraction(): InteractionRequest | null {
    return this.pendingInteraction
  }

  /**
   * Cancel pending interaction (e.g., when workflow is paused or cancelled)
   */
  cancelInteraction(): void {
    this.pendingInteraction = null
    this.inputResolver = null
  }

  /**
   * Helper methods for creating interaction requests
   */
  static createSelectRequest(
    stepId: number,
    stepName: string,
    message: string,
    choices: ChoiceOption[],
    defaultValue?: string
  ): InteractionRequest {
    return {
      type: 'select',
      message,
      stepId,
      stepName,
      options: {
        choices,
        defaultValue,
      },
    }
  }

  static createInputRequest(
    stepId: number,
    stepName: string,
    message: string,
    defaultValue?: string,
    placeholder?: string
  ): InteractionRequest {
    return {
      type: 'input',
      message,
      stepId,
      stepName,
      options: {
        defaultValue,
        placeholder,
      },
    }
  }

  static createConfirmRequest(
    stepId: number,
    stepName: string,
    message: string,
    defaultValue: boolean = false
  ): InteractionRequest {
    return {
      type: 'confirm',
      message,
      stepId,
      stepName,
      options: {
        defaultValue,
      },
    }
  }

  static createMultiselectRequest(
    stepId: number,
    stepName: string,
    message: string,
    choices: ChoiceOption[],
    defaultValue?: string[]
  ): InteractionRequest {
    return {
      type: 'multiselect',
      message,
      stepId,
      stepName,
      options: {
        choices,
        defaultValue,
      },
    }
  }
}

/**
 * Helper functions for step implementations to request user input
 */
export async function promptSelect(
  handler: InteractionHandler,
  stepId: number,
  stepName: string,
  message: string,
  choices: ChoiceOption[],
  defaultValue?: string
): Promise<string> {
  const request = InteractionHandler.createSelectRequest(
    stepId,
    stepName,
    message,
    choices,
    defaultValue
  )
  const input = await handler.requestInput(request)
  return input.value as string
}

export async function promptInput(
  handler: InteractionHandler,
  stepId: number,
  stepName: string,
  message: string,
  defaultValue?: string,
  placeholder?: string
): Promise<string> {
  const request = InteractionHandler.createInputRequest(
    stepId,
    stepName,
    message,
    defaultValue,
    placeholder
  )
  const input = await handler.requestInput(request)
  return input.value as string
}

export async function promptConfirm(
  handler: InteractionHandler,
  stepId: number,
  stepName: string,
  message: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const request = InteractionHandler.createConfirmRequest(
    stepId,
    stepName,
    message,
    defaultValue
  )
  const input = await handler.requestInput(request)
  return input.value as boolean
}

export async function promptMultiselect(
  handler: InteractionHandler,
  stepId: number,
  stepName: string,
  message: string,
  choices: ChoiceOption[],
  defaultValue?: string[]
): Promise<string[]> {
  const request = InteractionHandler.createMultiselectRequest(
    stepId,
    stepName,
    message,
    choices,
    defaultValue
  )
  const input = await handler.requestInput(request)
  return input.value as string[]
}

export default InteractionHandler

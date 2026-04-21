/**
 * Workflow Executor (Web Implementation)
 *
 * Executes workflow steps with pause/resume support for user interaction.
 * Real-time progress updates via SSE.
 */

import type { ExecutionEvent, WebExecutionContext, StepExecutionResult, StepHandler, UserInput } from '../types/step-execution'
import { ExecutionManager } from './execution-manager'
import { workflowService } from '../services/workflow-service'
import { STEPS } from '../constants'
import { InteractionHandler } from './interaction-handler'
import type { WorkflowState, WorkflowMode } from '../types'

// Import all step handlers
import { Step0ConfigCheck } from './steps/step0-config-check'
import { Step1AccountSelect } from './steps/step1-account-select'
import { Step2Brainstorm } from './steps/step2-brainstorm'
import { Step3Research } from './steps/step3-research'
import { Step4Outline } from './steps/step4-outline'
import { Step5Draft } from './steps/step5-draft'
import { Step6Format } from './steps/step6-format'
import { Step7CoverImage } from './steps/step7-cover-image'
import { Step8Illustrations } from './steps/step8-illustrations'
import { Step9Preview } from './steps/step9-preview'
import { Step10Publish } from './steps/step10-publish'

export class WorkflowExecutor {
  private workflowId: string
  private mode: WorkflowMode
  private state: WorkflowState | null = null
  private context: WebExecutionContext | null = null
  private stepHandlers: Map<number, StepHandler> = new Map()
  private interactionHandler: InteractionHandler | null = null
  private emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void

  constructor(workflow: WorkflowState) {
    this.workflowId = workflow.workflowId
    this.mode = workflow.mode
    this.state = workflow

    // Create event emitter
    this.emitEvent = ExecutionManager.createEventEmitter(this.workflowId)

    // Initialize interaction handler
    this.interactionHandler = new InteractionHandler({
      workflowId: this.workflowId,
      onEvent: this.emitEvent,
    })

    // Register step handlers
    this.registerStepHandlers()
  }

  private registerStepHandlers(): void {
    const handlers: StepHandler[] = [
      new Step0ConfigCheck(),
      new Step1AccountSelect(),
      new Step2Brainstorm(),
      new Step3Research(),
      new Step4Outline(),
      new Step5Draft(),
      new Step6Format(),
      new Step7CoverImage(),
      new Step8Illustrations(),
      new Step9Preview(),
      new Step10Publish(),
    ]

    for (const handler of handlers) {
      this.stepHandlers.set(handler.id, handler)
    }
  }

  private buildContext(): WebExecutionContext {
    if (!this.state) {
      throw new Error('Workflow state not initialized')
    }

    return {
      workflowId: this.state.workflowId,
      mode: this.state.mode,
      currentStep: this.state.currentStep,
      accountId: this.state.accountId,
      userId: (this.state as any).userId,
      outputPath: this.state.outputPath,
      metadata: this.state.metadata || {},
      stepResults: new Map(
        Object.entries(this.state.stepResults || {}).map(([id, result]) => [
          parseInt(id),
          {
            success: result.status === 'completed',
            data: result.data,
            error: result.error,
          } as StepExecutionResult,
        ])
      ),
    }
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<void> {
    if (!this.state) {
      throw new Error('Workflow state not loaded')
    }

    // Create execution session
    ExecutionManager.createSession(this.workflowId)
    ExecutionManager.updateStatus(this.workflowId, 'running')

    // Build execution context
    this.context = this.buildContext()

    // Emit started event
    this.emitEvent({
      type: 'started',
      data: {
        message: 'Workflow execution started',
        progress: {
          current: this.state.currentStep,
          total: STEPS.length,
        },
      },
    })

    const steps = STEPS
    let startIndex = this.state.currentStep

    try {
      // Execute steps
      for (let i = startIndex; i < steps.length; i++) {
        const step = steps[i]
        const handler = this.stepHandlers.get(step.id)

        if (!handler) {
          console.error(`Step handler ${step.id} not found`)
          this.emitEvent({
            type: 'error',
            data: {
              stepId: step.id,
              stepName: step.name,
              message: `Step handler ${step.id} not found`,
              error: `Step handler ${step.id} not found`,
            },
          })
          continue
        }

        // Check if step is already completed
        const existingResult = this.state.stepResults[step.id]
        if (existingResult?.status === 'completed') {
          this.emitEvent({
            type: 'log',
            data: {
              stepId: step.id,
              stepName: step.name,
              message: `Step ${step.id} already completed, skipping...`,
            },
          })
          continue
        }

        // Update current step
        ExecutionManager.updateCurrentStep(this.workflowId, step.id)
        this.state.currentStep = step.id

        // Emit progress event
        this.emitEvent({
          type: 'progress',
          data: {
            stepId: step.id,
            stepName: step.name,
            message: `Executing step ${step.id}: ${step.name}...`,
            progress: {
              current: step.id + 1,
              total: steps.length,
            },
          },
        })

        // Execute step
        const result = await handler.execute(this.context, this.emitEvent)

        // Store result in context
        this.context.stepResults.set(step.id, result)

        // Store result in state with correct type
        this.state.stepResults[step.id] = {
          status: result.success ? 'completed' : 'failed',
          data: result.data,
          error: result.error,
          completedAt: result.success ? new Date().toISOString() : undefined,
        }

        // Update workflow state
        await workflowService.updateStep(
          this.workflowId,
          step.id,
          result.success ? 'completed' : 'failed',
          result.data,
          result.error
        )

        // Handle result
        if (!result.success) {
          this.emitEvent({
            type: 'error',
            data: {
              stepId: step.id,
              stepName: step.name,
              message: `Step ${step.id} failed: ${result.error}`,
              error: result.error,
            },
          })

          ExecutionManager.updateStatus(this.workflowId, 'failed')
          await workflowService.updateStatus(this.workflowId, 'failed')
          return
        }

        // Handle interaction request
        if (result.requiresInteraction && result.interaction) {
          ExecutionManager.setPendingInteraction(this.workflowId, result.interaction)
          this.emitEvent({
            type: 'waiting',
            data: {
              stepId: result.interaction.stepId,
              stepName: result.interaction.stepName,
              message: result.interaction.message,
              interaction: result.interaction,
            },
          })
          // Pause execution - will be resumed when user input is submitted
          return
        }

        // Emit step completed event
        this.emitEvent({
          type: 'completed',
          data: {
            stepId: step.id,
            stepName: step.name,
            message: `Step ${step.id} completed successfully`,
            result: result.data,
          },
        })

        // Handle mode-specific pause logic
        if (this.state.mode === 'key_checkpoint' && step.isKeyCheckpoint && i < steps.length - 1) {
          // Emit event about key checkpoint
          this.emitEvent({
            type: 'log',
            data: {
              stepId: step.id,
              stepName: step.name,
              message: 'Key checkpoint reached',
            },
          })
          // In key_checkpoint mode, we continue automatically for now
          // User can manually pause if needed
        }

        // Handle skipToStep
        if (result.skipToStep !== undefined && result.skipToStep >= 0) {
          i = result.skipToStep - 1 // -1 because loop will increment
        }
      }

      // Workflow completed
      this.state.status = 'completed'
      await workflowService.updateStatus(this.workflowId, 'completed')

      this.emitEvent({
        type: 'finished',
        data: {
          message: 'Workflow completed successfully!',
        },
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emitEvent({
        type: 'error',
        data: {
          message: 'Workflow execution failed',
          error: errorMessage,
        },
      })

      ExecutionManager.updateStatus(this.workflowId, 'failed')
      await workflowService.updateStatus(this.workflowId, 'failed')
    }
  }

  /**
   * Handle user input and resume execution
   */
  async handleInput(input: UserInput): Promise<void> {
    if (!this.state || !this.context) {
      throw new Error('Workflow state not initialized')
    }

    // Clear pending interaction
    ExecutionManager.clearPendingInteraction(this.workflowId)

    // Get the step handler to process the input
    const handler = this.stepHandlers.get(input.stepId)
    if (handler && 'handleInput' in handler) {
      const result = await (handler as any).handleInput(
        this.context,
        input.value as string,
        this.emitEvent
      )

      if (result.success) {
        // Update step result
        this.context.stepResults.set(input.stepId, result)
        this.state.stepResults[input.stepId] = {
          status: 'completed',
          data: result.data,
          completedAt: new Date().toISOString(),
        }

        await workflowService.updateStep(
          this.workflowId,
          input.stepId,
          'completed',
          result.data
        )

        // Emit completion event
        this.emitEvent({
          type: 'completed',
          data: {
            stepId: input.stepId,
            message: `Step ${input.stepId} completed with user input`,
            result: result.data,
          },
        })

        // Resume execution from next step
        this.state.currentStep = input.stepId + 1
        await workflowService.save(this.state)

        // Continue execution
        await this.execute()
      } else {
        this.emitEvent({
          type: 'error',
          data: {
            stepId: input.stepId,
            message: `Step ${input.stepId} failed: ${result.error}`,
            error: result.error,
          },
        })
      }
    } else {
      // No special handler, just continue execution
      this.state.currentStep = input.stepId + 1
      await workflowService.save(this.state)
      await this.execute()
    }
  }
}

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
  private emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void

  constructor(workflow: WorkflowState) {
    this.workflowId = workflow.workflowId
    this.mode = workflow.mode
    this.state = workflow

    // Create event emitter
    this.emitEvent = ExecutionManager.createEventEmitter(this.workflowId)

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

    // Build or refresh execution context (preserves userInput if set)
    const prevUserInput = this.context?.userInput
    this.context = this.buildContext()
    if (prevUserInput) {
      this.context.userInput = prevUserInput
    }

    // Only emit started and create session on first run
    const existingSession = ExecutionManager.getSession(this.workflowId)
    if (!existingSession) {
      ExecutionManager.createSession(this.workflowId)
    }
    ExecutionManager.updateStatus(this.workflowId, 'running')

    if (!existingSession) {
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
    }

    const steps = STEPS
    let startIndex = this.state.currentStep

    try {
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

        // Skip already completed steps
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

        // Handle interaction request - pause WITHOUT marking as completed
        if (result.success && result.requiresInteraction && result.interaction) {
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
          // Clear userInput so next invocation starts fresh
          if (this.context) this.context.userInput = undefined
          return
        }

        // Store result in context and state
        this.context.stepResults.set(step.id, result)
        this.state.stepResults[step.id] = {
          status: result.success ? 'completed' : 'failed',
          data: result.data,
          error: result.error,
          completedAt: result.success ? new Date().toISOString() : undefined,
        }

        await workflowService.updateStep(
          this.workflowId,
          step.id,
          result.success ? 'completed' : 'failed',
          result.data,
          result.error
        )

        // Handle failure
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

        // Handle skipToStep
        if (result.skipToStep !== undefined && result.skipToStep >= 0) {
          i = result.skipToStep - 1
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

      // Clean up executor reference
      ExecutionManager.removeExecutor(this.workflowId)

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

    // Set user input on context so the step's execute() can read it
    this.context.userInput = input

    // Keep currentStep at the step that needs input (don't advance)
    this.state.currentStep = input.stepId
    await workflowService.save(this.state)

    // Resume execution - the step will see userInput and process it
    await this.execute()
  }
}

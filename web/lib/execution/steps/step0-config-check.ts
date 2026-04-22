/**
 * Step 0: Configuration Check (Web Implementation)
 *
 * Verifies environment variables and API credentials.
 * Uses database for account checks instead of CLI config files.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
} from '../../types/step-execution'
import { validateLLMConfig, getLLMInfo } from '../../../../src/llm'
import { getAccountsByUserId } from '../../db/queries/accounts'

export class Step0ConfigCheck implements StepHandler {
  id = 0
  name = 'Configuration Check'
  description = 'Verify environment variables, API credentials, and account configurations'
  isKeyCheckpoint = false

  async execute(
    context: WebExecutionContext,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult> {
    emitEvent({
      type: 'progress',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: 'Checking configuration...',
      },
    })

    const errors: string[] = []

    // Check LLM configuration
    const llmValidation = validateLLMConfig()
    if (!llmValidation.valid) {
      errors.push(...llmValidation.errors)
    } else {
      const llmInfo = getLLMInfo()
      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `LLM configured: ${llmInfo.provider}/${llmInfo.model}`,
        },
      })
    }

    // Check accounts from database
    const userId = context.userId
    if (userId) {
      const accounts = await getAccountsByUserId(userId)
      if (accounts.length === 0) {
        errors.push('No WeChat accounts configured. Add one in the Accounts page.')
      } else {
        emitEvent({
          type: 'log',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Found ${accounts.length} account(s)`,
          },
        })
      }
    } else {
      errors.push('No user ID in execution context')
    }

    if (errors.length > 0) {
      emitEvent({
        type: 'error',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'Configuration check failed',
          error: errors.join('\n'),
        },
      })

      return {
        success: false,
        error: `Configuration errors found:\n${errors.join('\n')}`,
      }
    }

    emitEvent({
      type: 'completed',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: 'All configurations validated successfully',
      },
    })

    return { success: true }
  }
}

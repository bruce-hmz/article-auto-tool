/**
 * Step 0: Configuration Check (Web Implementation)
 *
 * Verifies environment variables, API credentials, and account configurations.
 * This step has no user interaction.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
} from '../../types/step-execution'

// Import CLI modules
import { FileManager } from '../../file-manager'
import { validateLLMConfig, getLLMInfo } from '../../../../src/llm'
import { AccountManager } from '../../../../src/accounts'

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

    // Check .env file
    const envExists = await FileManager.exists('.env')
    if (!envExists) {
      errors.push('.env file not found. Copy .env.example to .env and configure your credentials.')
    } else {
      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: '.env file found',
        },
      })
    }

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

    // Check Volcano API key
    if (!process.env.VOLCANO_API_KEY) {
      errors.push('VOLCANO_API_KEY not found in environment variables')
    } else {
      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'Volcano API key configured',
        },
      })
    }

    // Check account configurations
    const accountManager = new AccountManager()
    await accountManager.loadAccounts()
    const accounts = accountManager.getAllAccounts()

    if (accounts.length === 0) {
      errors.push('No account configurations found in config/accounts/')
    } else {
      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `Found ${accounts.length} account(s)`,
        },
      })

      // Validate each account
      for (const account of accounts) {
        const validation = await accountManager.validateAccount(account.id)
        if (!validation.valid) {
          errors.push(`Account "${account.name}": ${validation.errors.join(', ')}`)
        } else {
          emitEvent({
            type: 'log',
            data: {
              stepId: this.id,
              stepName: this.name,
              message: `Account "${account.name}" is properly configured`,
            },
          })
        }
      }
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
        result: {
          accountsCount: accounts.length,
        },
      },
    })

    return {
      success: true,
      data: {
        accountsCount: accounts.length,
      },
    }
  }
}

export default Step0ConfigCheck

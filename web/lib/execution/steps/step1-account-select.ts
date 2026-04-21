/**
 * Step 1: Account Selection (Web Implementation)
 *
 * Selects the WeChat official account to publish to.
 * Requires user interaction (select) if no account is pre-selected.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
  InteractionRequest,
} from '../../types/step-execution'
import { InteractionHandler } from '../interaction-handler'
import { AccountManager } from '../../../../src/accounts'

export class Step1AccountSelect implements StepHandler {
  id = 1
  name = 'Account Selection'
  description = 'Select the WeChat official account to publish to'
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
        message: 'Starting account selection...',
      },
    })

    const accountManager = new AccountManager()
    await accountManager.loadAccounts()

    const accounts = accountManager.getAllAccounts()

    if (accounts.length === 0) {
      emitEvent({
        type: 'error',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'No accounts configured',
          error: 'No accounts configured. Add account configuration files to config/accounts/',
        },
      })

      return {
        success: false,
        error: 'No accounts configured. Add account configuration files to config/accounts/',
      }
    }

    // If account is already selected in context, use it
    if (context.accountId) {
      const account = accountManager.getAccount(context.accountId)
      if (account) {
        emitEvent({
          type: 'log',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Using pre-selected account: ${account.name}`,
          },
        })

        context.metadata.accountConfig = account
        context.metadata.accountName = account.name

        return {
          success: true,
          data: {
            accountId: account.id,
            accountName: account.name,
            accountConfig: account,
          },
        }
      }
    }

    // Need user interaction to select account
    const choices = accounts.map((account) => ({
      value: account.id,
      label: account.name,
      description: account.id,
    }))

    const interaction: InteractionRequest = {
      type: 'select',
      message: 'Select a WeChat account:',
      stepId: this.id,
      stepName: this.name,
      options: {
        choices,
      },
    }

    return {
      success: true,
      requiresInteraction: true,
      interaction,
    }
  }

  /**
   * Handle user input for account selection
   */
  async handleInput(
    context: WebExecutionContext,
    inputValue: string,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult> {
    const accountManager = new AccountManager()
    await accountManager.loadAccounts()

    const selectedAccount = accountManager.getAccount(inputValue)

    if (!selectedAccount) {
      return {
        success: false,
        error: 'Failed to load selected account',
      }
    }

    emitEvent({
      type: 'log',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: `Selected account: ${selectedAccount.name}`,
      },
    })

    // Update context
    context.accountId = inputValue
    context.metadata.accountName = selectedAccount.name
    context.metadata.accountConfig = selectedAccount

    // Fix output path to include accountId
    const today = new Date().toISOString().split('T')[0]
    const newPath = `output/${inputValue}/${today}`
    if (!context.outputPath.includes(inputValue)) {
      context.outputPath = newPath
      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `Output path: ${newPath}`,
        },
      })
    }

    return {
      success: true,
      data: {
        accountId: inputValue,
        accountName: selectedAccount.name,
        accountConfig: selectedAccount,
      },
    }
  }
}

export default Step1AccountSelect

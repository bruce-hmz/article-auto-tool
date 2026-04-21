/**
 * Step 1: Account Selection (Web Implementation)
 *
 * Selects the WeChat official account to publish to.
 * Reads accounts from the database (per-user).
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
  InteractionRequest,
} from '../../types/step-execution'
import { getAccountsByUserId, getAccountById, decryptAccountSecret } from '../../db/queries/accounts'
import { getBriefByAccountId } from '../../db/queries/briefs'

export class Step1AccountSelect implements StepHandler {
  id = 1
  name = 'Account Selection'
  description = 'Select the WeChat official account to publish to'
  isKeyCheckpoint = false

  private async loadAccountWithBrief(account: { id: string; name: string; appId: string; appSecret: string; config: string | null }, context: WebExecutionContext) {
    const accountConfig = {
      id: account.id,
      name: account.name,
      appId: account.appId,
      appSecret: decryptAccountSecret(account.appSecret),
      config: account.config ? JSON.parse(account.config) : {},
    }

    // Load editorial brief from database
    const brief = await getBriefByAccountId(account.id)
    if (brief) {
      context.metadata.editorialBrief = {
        voice: brief.voice ?? undefined,
        audience: brief.audience ?? undefined,
        tone: brief.tone ?? undefined,
        topicDomains: brief.topicDomains ? JSON.parse(brief.topicDomains) : undefined,
        promptOverrides: brief.promptOverrides ? JSON.parse(brief.promptOverrides) : undefined,
      }
    }

    context.metadata.accountConfig = accountConfig
    context.metadata.accountName = account.name

    return accountConfig
  }

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

    const userId = context.userId
    if (!userId) {
      return {
        success: false,
        error: 'No user ID in execution context',
      }
    }

    const accounts = await getAccountsByUserId(userId)

    if (accounts.length === 0) {
      emitEvent({
        type: 'error',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'No accounts configured',
          error: 'No WeChat accounts configured. Add one in the Accounts page.',
        },
      })

      return {
        success: false,
        error: 'No WeChat accounts configured. Add one in the Accounts page.',
      }
    }

    // If account is already selected in context, use it
    if (context.accountId) {
      const account = accounts.find(a => a.id === context.accountId)
      if (account) {
        const accountConfig = await this.loadAccountWithBrief(account, context)

        emitEvent({
          type: 'log',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Using pre-selected account: ${account.name}`,
          },
        })

        return {
          success: true,
          data: {
            accountId: account.id,
            accountName: account.name,
            accountConfig,
          },
        }
      }
    }

    // Need user interaction to select account
    const choices = accounts.map((account) => ({
      value: account.id,
      label: account.name,
      description: account.appId ? `${account.appId.slice(0, 4)}****` : '',
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
    const userId = context.userId
    if (!userId) {
      return { success: false, error: 'No user ID in execution context' }
    }

    const account = await getAccountById(inputValue, userId)
    if (!account) {
      return { success: false, error: 'Selected account not found' }
    }

    const accountConfig = await this.loadAccountWithBrief(account, context)

    emitEvent({
      type: 'log',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: `Selected account: ${account.name}`,
      },
    })

    // Update context
    context.accountId = inputValue

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
        accountName: account.name,
        accountConfig,
      },
    }
  }
}

export default Step1AccountSelect

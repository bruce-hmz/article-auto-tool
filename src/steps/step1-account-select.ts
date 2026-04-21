import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { AccountManager } from '../accounts/account-manager';
import { StateManager } from '../core/state-manager';
import { promptSelect } from '../utils/prompts';

export class Step1AccountSelect implements Step {
  id = 1;
  name = 'Account Selection';
  description = 'Select the WeChat official account to publish to';
  isKeyCheckpoint = false;

  async execute(context: WorkflowContext): Promise<StepResult> {
    logger.step(this.id, this.name);

    const accountManager = new AccountManager();
    await accountManager.loadAccounts();

    const accounts = accountManager.getAllAccounts();

    if (accounts.length === 0) {
      return {
        success: false,
        error: 'No accounts configured. Add account configuration files to config/accounts/',
      };
    }

    // If account is already selected in context, use it
    if (context.accountId) {
      const account = accountManager.getAccount(context.accountId);
      if (account) {
        logger.info(`Using pre-selected account: ${account.name}`);
        context.metadata.accountConfig = account;
        context.metadata.accountName = account.name;

        // Ensure output path includes accountId
        await this.ensureOutputPath(context);

        return {
          success: true,
          data: {
            accountId: account.id,
            accountName: account.name,
            accountConfig: account,
          },
        };
      }
    }

    // Prompt user to select account
    const choices = accounts.map((account) => ({
      value: account.id,
      name: account.name,
      description: account.id,
    }));

    const selectedAccountId = await promptSelect('Select a WeChat account:', choices);
    const selectedAccount = accountManager.getAccount(selectedAccountId);

    if (!selectedAccount) {
      return {
        success: false,
        error: 'Failed to load selected account',
      };
    }

    logger.success(`Selected account: ${selectedAccount.name}`);

    // Store in context
    context.accountId = selectedAccountId;
    context.metadata.accountName = selectedAccount.name;
    context.metadata.accountConfig = selectedAccount;

    // Update output path to include accountId
    await this.ensureOutputPath(context);

    return {
      success: true,
      data: {
        accountId: selectedAccountId,
        accountName: selectedAccount.name,
        accountConfig: selectedAccount,
      },
    };
  }

  /**
   * Ensure the output path includes the accountId.
   * If the current outputPath doesn't include accountId, update it.
   */
  private async ensureOutputPath(context: WorkflowContext): Promise<void> {
    if (!context.accountId) return;

    // Check if outputPath already contains the accountId
    const pathParts = context.outputPath.split(/[/\\]/);
    if (pathParts.length >= 3 && pathParts[1] === context.accountId) {
      return; // Already includes accountId
    }

    const today = new Date().toISOString().split('T')[0];
    const newPath = `output/${context.accountId}/${today}`;

    logger.debug(`Updating output path: ${context.outputPath} -> ${newPath}`);
    context.outputPath = newPath;

    // Persist the updated path to state
    try {
      const stateManager = new StateManager();
      await stateManager.updateOutputPath(context.workflowId, context.accountId);
    } catch {
      // State file may not exist if we're in a context without state persistence.
      // The in-memory context is already updated, which is sufficient for this run.
      logger.debug('Could not persist output path update to state file');
    }
  }
}

export default Step1AccountSelect;

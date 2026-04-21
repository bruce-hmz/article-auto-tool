import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { FileManager } from '../utils/file-manager';
import { validateLLMConfig, getLLMInfo } from '../llm';
import { AccountManager } from '../accounts';

export class Step0ConfigCheck implements Step {
  id = 0;
  name = 'Configuration Check';
  description = 'Verify environment variables, API credentials, and account configurations';
  isKeyCheckpoint = false;

  async execute(context: WorkflowContext): Promise<StepResult> {
    logger.step(this.id, this.name);

    const errors: string[] = [];

    // Check .env file
    const envExists = await FileManager.exists('.env');
    if (!envExists) {
      errors.push('.env file not found. Copy .env.example to .env and configure your credentials.');
    } else {
      logger.success('.env file found');
    }

    // Check LLM configuration (supports multiple providers)
    const llmValidation = validateLLMConfig();
    if (!llmValidation.valid) {
      errors.push(...llmValidation.errors);
    } else {
      const llmInfo = getLLMInfo();
      logger.success(`LLM configured: ${llmInfo.provider}/${llmInfo.model}`);
    }

    // Check Volcano API key
    if (!process.env.VOLCANO_API_KEY) {
      errors.push('VOLCANO_API_KEY not found in environment variables');
    } else {
      logger.success('Volcano API key configured');
    }

    // Check account configurations
    const accountManager = new AccountManager();
    await accountManager.loadAccounts();
    const accounts = accountManager.getAllAccounts();

    if (accounts.length === 0) {
      errors.push('No account configurations found in config/accounts/');
    } else {
      logger.success(`Found ${accounts.length} account(s)`);

      // Validate each account
      for (const account of accounts) {
        const validation = await accountManager.validateAccount(account.id);
        if (!validation.valid) {
          errors.push(`Account "${account.name}": ${validation.errors.join(', ')}`);
        } else {
          logger.success(`Account "${account.name}" is properly configured`);
        }
      }
    }

    if (errors.length > 0) {
      logger.error('Configuration check failed:');
      errors.forEach((error) => logger.error(`  - ${error}`));

      return {
        success: false,
        error: `Configuration errors found:\n${errors.join('\n')}`,
      };
    }

    logger.success('All configurations validated successfully');

    return {
      success: true,
      data: {
        accountsCount: accounts.length,
      },
    };
  }
}

export default Step0ConfigCheck;

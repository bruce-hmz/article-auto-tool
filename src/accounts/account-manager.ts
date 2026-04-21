import * as path from 'path';
import * as fs from 'fs';
import { FileManager } from '../utils/file-manager';
import { logger } from '../utils/logger';
import type { AccountConfig } from '../types';

export class AccountManager {
  private accountsDir: string;
  private accounts: Map<string, AccountConfig> = new Map();

  constructor(accountsDir: string = 'config/accounts') {
    this.accountsDir = accountsDir;
  }

  async loadAccounts(): Promise<void> {
    this.accounts.clear();

    const files = await FileManager.listFiles(this.accountsDir, /\.json$/);

    for (const file of files) {
      try {
        const content = await FileManager.readFile(file);
        // Replace environment variables
        const processedContent = this.replaceEnvVars(content);
        const account = JSON.parse(processedContent) as AccountConfig;

        // Skip files that aren't valid account configs (e.g., brief templates)
        if (!account.id || !account.name) {
          logger.debug(`Skipping non-account file: ${file}`);
          continue;
        }

        this.accounts.set(account.id, account);
        logger.debug(`Loaded account: ${account.name} (${account.id})`);
      } catch (error) {
        logger.warn(`Failed to load account from ${file}:`, error);
      }
    }

    logger.info(`Loaded ${this.accounts.size} accounts`);
  }

  private replaceEnvVars(content: string): string {
    // Replace ${VAR_NAME} with environment variable values
    return content.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = process.env[varName];
      if (!value) {
        logger.warn(`Environment variable ${varName} not found`);
        return match;
      }
      return value;
    });
  }

  getAccount(accountId: string): AccountConfig | undefined {
    return this.accounts.get(accountId);
  }

  getAllAccounts(): AccountConfig[] {
    return Array.from(this.accounts.values());
  }

  async validateAccount(accountId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const account = this.getAccount(accountId);
    if (!account) {
      return {
        valid: false,
        errors: [`Account ${accountId} not found`],
      };
    }

    const errors: string[] = [];

    // Check required fields
    if (!account.appId || account.appId.startsWith('${')) {
      errors.push('appId is not configured');
    }
    if (!account.appSecret || account.appSecret.startsWith('${')) {
      errors.push('appSecret is not configured');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async listAccounts(): Promise<void> {
    const accounts = this.getAllAccounts();

    console.log('\nConfigured Accounts:\n');
    if (accounts.length === 0) {
      console.log('  No accounts configured');
      console.log('  Add account configuration files to config/accounts/');
    } else {
      accounts.forEach((account, index) => {
        console.log(`  ${index + 1}. ${account.name} (${account.id})`);
      });
    }
    console.log('');
  }
}

export default AccountManager;

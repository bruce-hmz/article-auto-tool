import * as path from 'path'
import { FileManager } from '../file-manager'
import type { AccountConfig } from '../types'

// Get the project root directory (parent of web/)
const PROJECT_ROOT = path.resolve(process.cwd(), '..')

export class AccountService {
  private accountsDir: string
  private accounts: Map<string, AccountConfig> = new Map()

  constructor() {
    this.accountsDir = path.join(PROJECT_ROOT, 'config', 'accounts')
  }

  async loadAccounts(): Promise<void> {
    this.accounts.clear()

    const files = await FileManager.listFiles(this.accountsDir, /\.json$/)

    for (const file of files) {
      try {
        const content = await FileManager.readFile(file)
        const processedContent = this.replaceEnvVars(content)
        const account = JSON.parse(processedContent) as AccountConfig

        this.accounts.set(account.id, account)
      } catch (error) {
        console.error(`Failed to load account from ${file}:`, error)
      }
    }
  }

  private replaceEnvVars(content: string): string {
    return content.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = process.env[varName]
      if (!value) {
        return match
      }
      return value
    })
  }

  getAccount(accountId: string): AccountConfig | undefined {
    return this.accounts.get(accountId)
  }

  getAllAccounts(): AccountConfig[] {
    return Array.from(this.accounts.values())
  }

  async validateAccount(accountId: string): Promise<{
    valid: boolean
    errors: string[]
  }> {
    const account = this.getAccount(accountId)
    if (!account) {
      return {
        valid: false,
        errors: [`Account ${accountId} not found`],
      }
    }

    const errors: string[] = []

    if (!account.appId || account.appId.startsWith('${')) {
      errors.push('appId is not configured')
    }
    if (!account.appSecret || account.appSecret.startsWith('${')) {
      errors.push('appSecret is not configured')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const accountService = new AccountService()

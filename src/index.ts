#!/usr/bin/env bun

import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import { logger } from './utils/logger';
import { PublishingStagingManager } from './utils/publishing-staging';
import { StateManager, StepManager, WorkflowEngine } from './core';
import { AccountManager } from './accounts';
import {
  Step0ConfigCheck,
  Step1AccountSelect,
  Step2Brainstorm,
  Step3Research,
  Step4Outline,
  Step5Draft,
  Step6Format,
  Step7CoverImage,
  Step8Illustrations,
  Step9Preview,
  Step10Publish,
  } from './steps';
import { validateLLMConfig, getLLMInfo } from './llm';
import type { WorkflowMode } from './types';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('wechat-auto-tool')
  .description('WeChat Official Account article generation and publishing workflow system')
  .version('1.0.0');

// Start command
program
  .command('start')
  .description('Start a new workflow')
  .option('-m, --mode <mode>', 'Workflow mode (key_checkpoint, auto, step_by_step)', 'key_checkpoint')
  .option('-a, --account <accountId>', 'Account ID to use')
  .action(async (options) => {
    try {
      const mode = options.mode as WorkflowMode;

      if (!['key_checkpoint', 'auto', 'step_by_step'].includes(mode)) {
        console.error(chalk.red('Invalid mode. Use: key_checkpoint, auto, or step_by_step'));
        process.exit(1);
      }

      console.log(chalk.bold.cyan('\n🚀 Starting WeChat Article Workflow\n'));

      // Initialize components
      const stateManager = new StateManager();
      const stepManager = new StepManager();

      // Register all steps
      stepManager.register(new Step0ConfigCheck());
      stepManager.register(new Step1AccountSelect());
      stepManager.register(new Step2Brainstorm());
      stepManager.register(new Step3Research());
      stepManager.register(new Step4Outline());
      stepManager.register(new Step5Draft());
      stepManager.register(new Step6Format());
      stepManager.register(new Step7CoverImage());
      stepManager.register(new Step8Illustrations());
      stepManager.register(new Step9Preview());
      stepManager.register(new Step10Publish());

      // Create workflow engine
      const workflowEngine = new WorkflowEngine(stateManager, stepManager);

      // Start workflow
      await workflowEngine.start(mode, options.account);

      console.log(chalk.bold.green('\n✅ Workflow completed successfully!\n'));
    } catch (error) {
      console.error(chalk.bold.red('\n❌ Workflow failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Resume command
program
  .command('resume')
  .description('Resume a paused workflow')
  .argument('<workflowId>', 'Workflow ID to resume')
  .action(async (workflowId) => {
    try {
      console.log(chalk.bold.cyan('\n▶️  Resuming Workflow\n'));

      // Initialize components
      const stateManager = new StateManager();
      const stepManager = new StepManager();

      // Register all steps
      stepManager.register(new Step0ConfigCheck());
      stepManager.register(new Step1AccountSelect());
      stepManager.register(new Step2Brainstorm());
      stepManager.register(new Step3Research());
      stepManager.register(new Step4Outline());
      stepManager.register(new Step5Draft());
      stepManager.register(new Step6Format());
      stepManager.register(new Step7CoverImage());
      stepManager.register(new Step8Illustrations());
      stepManager.register(new Step9Preview());
      stepManager.register(new Step10Publish());

      // Create workflow engine
      const workflowEngine = new WorkflowEngine(stateManager, stepManager);

      // Resume workflow
      await workflowEngine.start('key_checkpoint', undefined, workflowId);

      console.log(chalk.bold.green('\n✅ Workflow completed successfully!\n'));
    } catch (error) {
      console.error(chalk.bold.red('\n❌ Resume failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('List all workflows')
  .action(async () => {
    try {
      const stateManager = new StateManager();
      await stateManager.initialize();

      const workflows = await stateManager.listWorkflows();

      if (workflows.length === 0) {
        console.log(chalk.gray('\nNo workflows found.\n'));
        return;
      }

      console.log(chalk.bold.cyan('\n📋 Workflows:\n'));

      workflows.forEach((workflow, index) => {
        const statusEmoji =
          workflow.status === 'completed' ? '✅' :
          workflow.status === 'failed' ? '❌' :
          workflow.status === 'paused' ? '⏸️' : '▶️';

        console.log(`${statusEmoji} ${index + 1}. ${workflow.id}`);
        console.log(`   Status: ${workflow.status}`);
        console.log(`   Started: ${workflow.startedAt}\n`);
      });
    } catch (error) {
      console.error(chalk.red('Failed to list workflows:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Accounts command
program
  .command('accounts')
  .description('List configured accounts')
  .action(async () => {
    try {
      const accountManager = new AccountManager();
      await accountManager.loadAccounts();
      await accountManager.listAccounts();
    } catch (error) {
      console.error(chalk.red('Failed to list accounts:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate configuration and credentials')
  .action(async () => {
    try {
      console.log(chalk.bold.cyan('\n🔍 Validating Configuration\n'));

      // Check LLM configuration
      console.log(chalk.bold('LLM Configuration:'));
      const llmValidation = validateLLMConfig();
      if (llmValidation.valid) {
        const llmInfo = getLLMInfo();
        console.log(`  Provider: ${chalk.green(llmInfo.provider)}`);
        console.log(`  Model: ${chalk.green(llmInfo.model)}`);
      } else {
        console.log(`  ${chalk.red('❌ Invalid configuration')}`);
        llmValidation.errors.forEach((error) => {
          console.log(`    - ${chalk.red(error)}`);
        });
      }
      console.log('');

      // Check image generation API
      console.log(chalk.bold('Image Generation:'));
      console.log(`  VOLCANO_API_KEY: ${process.env.VOLCANO_API_KEY ? '✅ Set' : '❌ Not set'}`);
      console.log('');

      // Check web search
      console.log(chalk.bold('Web Search:'));
      const searchProvider = process.env.SEARCH_PROVIDER || 'auto';
      const hasBing = !!process.env.BING_API_KEY;
      const hasTavily = !!process.env.TAVILY_API_KEY;
      console.log(`  Provider: ${chalk.cyan(searchProvider)}`);
      console.log(`  BING_API_KEY: ${hasBing ? '✅ Set' : '❌ Not set'}`);
      console.log(`  TAVILY_API_KEY: ${hasTavily ? '✅ Set' : '❌ Not set'}`);
      console.log('');

      // Check accounts
      const accountManager = new AccountManager();
      await accountManager.loadAccounts();
      const accounts = accountManager.getAllAccounts();

      console.log(chalk.bold('Accounts:'));
      if (accounts.length === 0) {
        console.log('  ❌ No accounts configured');
      } else {
        for (const account of accounts) {
          const validation = await accountManager.validateAccount(account.id);
          const status = validation.valid ? '✅ Valid' : '❌ Invalid';
          console.log(`  ${status} - ${account.name} (${account.id})`);
          if (!validation.valid) {
            validation.errors.forEach((error) => {
              console.log(`    - ${error}`);
            });
          }
        }
      }
      console.log('');

      // Check directories
      console.log(chalk.bold('Directories:'));
      console.log(`  config/accounts/: ${await fs.access('config/accounts').then(() => '✅ Exists').catch(() => '❌ Missing')}`);
      console.log(`  output/: ${await fs.access('output').then(() => '✅ Exists').catch(() => '⚠️  Will be created')}`);
      console.log('');

      console.log(chalk.bold.green('✅ Validation complete\n'));
    } catch (error) {
      console.error(chalk.red('Validation failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Staging command - list staged articles
program
  .command('staging')
  .description('List staged articles (for recovery)')
  .action(async () => {
    try {
      const stagingManager = new PublishingStagingManager();
      const staged = await stagingManager.listStaging();

      if (staged.length === 0) {
        console.log(chalk.gray('\nNo staged articles found.\n'));
        return;
      }

      console.log(chalk.bold.cyan('\n📦 Staged Articles:\n'));

      staged.forEach((item, index) => {
        const statusEmoji =
          item.status === 'success' ? '✅' :
          item.status === 'failed' ? '❌' : '⏳';

        console.log(`${statusEmoji} ${index + 1}. ${item.title}`);
        console.log(`   Workflow ID: ${chalk.gray(item.workflowId)}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   Retries: ${item.retryCount}`);
        console.log(`   Updated: ${item.updatedAt}\n`);
      });

      if (staged.some(s => s.status === 'failed')) {
        console.log(chalk.yellow('💡 Use "recover <workflowId>" to retry failed articles\n'));
      }
    } catch (error) {
      console.error(chalk.red('Failed to list staged articles:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Recover command - retry publishing from staging
program
  .command('recover')
  .description('Recover and retry publishing a failed article')
  .argument('[workflowId]', 'Workflow ID to recover (optional, will show list if not provided)')
  .action(async (workflowId) => {
    try {
      const stagingManager = new PublishingStagingManager();

      // If no workflowId provided, show failed articles
      if (!workflowId) {
        const failed = await stagingManager.listFailed();

        if (failed.length === 0) {
          console.log(chalk.gray('\nNo failed articles to recover.\n'));
          return;
        }

        console.log(chalk.bold.cyan('\n❌ Failed Articles (recoverable):\n'));

        failed.forEach((item, index) => {
          console.log(`${index + 1}. ${item.title}`);
          console.log(`   Workflow ID: ${chalk.cyan(item.workflowId)}`);
          console.log(`   Retries: ${item.retryCount}`);
          console.log(`   Last attempt: ${item.updatedAt}\n`);
        });

        console.log(chalk.yellow('💡 Run "recover <workflowId>" to retry a specific article\n'));
        return;
      }

      // Load staging data
      const stagingData = await stagingManager.load(workflowId);
      if (!stagingData) {
        console.error(chalk.red(`No staging data found for workflow: ${workflowId}`));
        process.exit(1);
      }

      if (stagingData.publishStatus === 'success') {
        console.log(chalk.green('\n✅ This article was already published successfully!\n'));
        console.log(`Draft Media ID: ${stagingData.draftMediaId}`);
        console.log(`Published at: ${stagingData.publishedAt}\n`);
        return;
      }

      console.log(chalk.bold.cyan('\n🔄 Recovering Article\n'));
      console.log(`Title: ${stagingData.article.title}`);
      console.log(`Retries so far: ${stagingData.retryCount}`);
      console.log(`Last error: ${stagingData.publishError || 'Unknown'}\n`);

      // Initialize components for workflow
      const stateManager = new StateManager();
      const stepManager = new StepManager();

      // Register all steps
      stepManager.register(new Step0ConfigCheck());
      stepManager.register(new Step1AccountSelect());
      stepManager.register(new Step2Brainstorm());
      stepManager.register(new Step3Research());
      stepManager.register(new Step4Outline());
      stepManager.register(new Step5Draft());
      stepManager.register(new Step6Format());
      stepManager.register(new Step7CoverImage());
      stepManager.register(new Step8Illustrations());
      stepManager.register(new Step9Preview());
      stepManager.register(new Step10Publish());

      // Create workflow engine
      const workflowEngine = new WorkflowEngine(stateManager, stepManager);

      // Resume from step 10 (publishing) with the staged data
      await workflowEngine.start('key_checkpoint', stagingData.accountId, workflowId);

      console.log(chalk.bold.green('\n✅ Recovery completed successfully!\n'));
    } catch (error) {
      console.error(chalk.bold.red('\n❌ Recovery failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

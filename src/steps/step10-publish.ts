import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { WeChatAPI } from '../accounts/wechat-api';
import { AccountManager } from '../accounts/account-manager';
import { promptConfirm } from '../utils/prompts';
import { PublishingStagingManager } from '../utils/publishing-staging';
import type { Article, GeneratedImage } from '../types/article';

export class Step10Publish implements Step {
  id = 10;
  name = 'Publish to WeChat';
  description = 'Save article to WeChat draft box';
  isKeyCheckpoint = true; // Final checkpoint

  async execute(context: WorkflowContext): Promise<StepResult> {
    logger.step(this.id, this.name);

    const stagingManager = new PublishingStagingManager();

    // Get account configuration
    const accountManager = new AccountManager();
    await accountManager.loadAccounts();

    const accountId = context.accountId;
    if (!accountId) {
      return {
        success: false,
        error: 'No account selected',
      };
    }

    const account = accountManager.getAccount(accountId);
    if (!account) {
      return {
        success: false,
        error: `Account ${accountId} not found`,
      };
    }

    // Validate account
    const validation = await accountManager.validateAccount(accountId);
    if (!validation.valid) {
      return {
        success: false,
        error: `Account validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Try to load from staging area first (for recovery)
    let article = context.metadata.article as Article | undefined;
    let coverImage = context.metadata.coverImage as GeneratedImage | undefined;
    let publishingInfo = context.metadata.publishingInfo as any;

    const stagingData = await stagingManager.load(context.workflowId);
    if (stagingData && stagingData.publishStatus === 'failed') {
      logger.info(`Found staged article from previous failed attempt (retries: ${stagingData.retryCount})`);
      // Use staged data
      article = stagingData.article;
      coverImage = stagingData.coverImage;
      publishingInfo = stagingData.publishingInfo;
      context.metadata.article = article;
      context.metadata.coverImage = coverImage;
      context.metadata.publishingInfo = publishingInfo;
    }

    if (!article || !publishingInfo) {
      return {
        success: false,
        error: 'Article or publishing info not found',
      };
    }

    // Confirm publishing
    console.log(`\nReady to publish to: ${account.name}`);
    console.log(`Article: ${article.title}\n`);

    const shouldPublish = await promptConfirm(
      'Save this article to WeChat draft box?',
      true
    );

    if (!shouldPublish) {
      logger.warn('Publishing cancelled by user');
      return {
        success: false,
        error: 'User cancelled publishing',
      };
    }

    // Initialize WeChat API
    const wechatApi = new WeChatAPI({
      appId: account.appId,
      appSecret: account.appSecret,
    });

    // Test connection
    logger.info('Testing WeChat API connection...');
    const connectionOk = await wechatApi.testConnection();

    if (!connectionOk) {
      // Mark as failed in staging
      await stagingManager.markFailed(context.workflowId, 'WeChat API connection failed');
      logger.warn('Article saved to staging area. Use "recover" command to retry after fixing the issue.');
      return {
        success: false,
        error: 'Failed to connect to WeChat API. Check your credentials.',
      };
    }

    // Upload cover image if available
    let coverMediaId: string | undefined;
    if (coverImage) {
      try {
        logger.info('Uploading cover image...');
        const uploadResult = await wechatApi.uploadImage(coverImage.localPath);
        coverMediaId = uploadResult.mediaId;
        logger.success(`Cover image uploaded: ${coverMediaId}`);
      } catch (error) {
        logger.error('Failed to upload cover image', error);
        // Continue without cover image
      }
    }

    // Save to draft
    logger.info('Saving article to WeChat drafts...');

    try {
      const draftMediaId = await wechatApi.saveDraft({
        title: publishingInfo.title,
        author: publishingInfo.author,
        digest: publishingInfo.digest,
        content: publishingInfo.content,
        coverImageMediaId: coverMediaId,
      });

      logger.success('Article saved to WeChat draft box!');
      logger.info(`Draft Media ID: ${draftMediaId}`);
      logger.info(`View in WeChat: https://mp.weixin.qq.com`);

      // Mark as success in staging
      await stagingManager.markSuccess(context.workflowId, draftMediaId);

      // Save final status
      context.metadata.draftMediaId = draftMediaId;
      context.metadata.publishedAt = new Date().toISOString();

      return {
        success: true,
        data: {
          draftMediaId,
          accountId: account.id,
          accountName: account.name,
          viewUrl: 'https://mp.weixin.qq.com',
        },
        requiresUserAction: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save draft', error);

      // Mark as failed in staging
      await stagingManager.markFailed(context.workflowId, errorMessage);
      logger.warn('Article saved to staging area. Use "recover" command to retry after fixing the issue.');

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

export default Step10Publish;

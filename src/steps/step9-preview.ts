import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { HTMLConverter } from '../generators/html-converter';
import { FileManager } from '../utils/file-manager';
import { promptConfirm } from '../utils/prompts';
import { PublishingStagingManager } from '../utils/publishing-staging';
import * as path from 'path';
import type { Article, FormattedArticle, GeneratedImage, Outline } from '../types/article';

export class Step9Preview implements Step {
  id = 9;
  name = 'Preview Before Publishing';
  description = 'Review article and prepare for publishing';
  isKeyCheckpoint = true; // Key checkpoint

  async execute(context: WorkflowContext): Promise<StepResult> {
    logger.step(this.id, this.name);

    const article = context.metadata.article as Article | undefined;
    const formatted = context.metadata.formattedArticle as FormattedArticle | undefined;
    const coverImage = context.metadata.coverImage as GeneratedImage | undefined;
    const illustrations = context.metadata.illustrations as GeneratedImage[] | undefined;
    const outline = context.metadata.outline as Outline | undefined;

    if (!article) {
      return {
        success: false,
        error: 'No article found. Please complete Step 5 first.',
      };
    }

    // Generate HTML for WeChat
    const htmlConverter = new HTMLConverter();
    const articleHtml = await htmlConverter.convert(article.content);
    const fullHtml = htmlConverter.wrapWithTemplate(articleHtml, article.title);

    // Save HTML
    const htmlOutputPath = path.join(context.outputPath, '09-preview.html');
    await FileManager.writeFile(htmlOutputPath, fullHtml);

    // Generate digest/summary
    const digest = this.generateDigest(article.content);

    // Display preview
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('         ARTICLE PREVIEW');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Title: ${article.title}`);
    console.log(`Author: ${article.author}`);
    console.log(`Word Count: ~${formatted?.metadata.wordCount || 'N/A'}`);
    console.log(`Reading Time: ~${formatted?.metadata.readingTime || 'N/A'} min`);
    console.log(`\nDigest: ${digest}`);

    if (coverImage) {
      console.log(`\nCover Image: ${coverImage.localPath}`);
    }

    if (illustrations && illustrations.length > 0) {
      console.log(`Illustrations: ${illustrations.length} image(s)`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show first part of article
    const preview = article.content.split('\n\n').slice(0, 5).join('\n\n');
    console.log('Article Preview:\n');
    console.log(preview.substring(0, 800) + '...\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Ask for confirmation
    const isReadyToPublish = await promptConfirm(
      'Is the article ready to publish?',
      true
    );

    if (!isReadyToPublish) {
      logger.warn('Please review and modify the article before publishing');
      return {
        success: false,
        error: 'User cancelled publishing',
      };
    }

    logger.success('Article approved for publishing');

    // Store publishing info in context
    context.metadata.publishingInfo = {
      title: article.title,
      author: article.author || 'Claude AI',
      digest,
      content: articleHtml,
      coverImageMediaId: coverImage?.mediaId,
    };

    // Save to staging area for recovery if publishing fails
    try {
      const stagingManager = new PublishingStagingManager();
      await stagingManager.save(context.workflowId, {
        workflowId: context.workflowId,
        accountId: context.accountId || '',
        article,
        formattedArticle: formatted,
        outline,
        coverImage,
        illustrations,
        publishingInfo: context.metadata.publishingInfo as any,
        outputPath: context.outputPath,
      });
      logger.info('Article saved to staging area (for recovery if publishing fails)');
    } catch (error) {
      logger.warn('Failed to save to staging area, continuing anyway');
    }

    return {
      success: true,
      data: {
        htmlOutputPath,
        digest,
        readyToPublish: true,
      },
      requiresUserAction: true,
    };
  }

  private generateDigest(content: string): string {
    // Remove markdown formatting
    const plainText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\n/g, ' ')
      .trim();

    // Get first 120 characters
    const digest = plainText.substring(0, 120);

    // Find last complete sentence
    const lastPeriod = digest.lastIndexOf('。');
    const lastQuestion = digest.lastIndexOf('？');
    const lastExclamation = digest.lastIndexOf('！');

    const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

    if (lastSentenceEnd > 50) {
      return digest.substring(0, lastSentenceEnd + 1);
    }

    return digest + '...';
  }
}

export default Step9Preview;

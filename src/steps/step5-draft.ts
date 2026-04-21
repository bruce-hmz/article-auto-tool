import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { createLLMClient, validateLLMConfig, getLLMInfo } from '../llm';
import { promptConfirm, promptSelect } from '../utils/prompts';
import { FileManager } from '../utils/file-manager';
import { PromptManager } from '../utils/prompt-manager';
import * as path from 'path';
import type { TopicIdea, ResearchMaterial, Outline, Article } from '../types/article';
import type { AccountConfig } from '../types/account';

export class Step5Draft implements Step {
  id = 5;
  name = 'Write Draft';
  description = 'Generate article draft based on outline';
  isKeyCheckpoint = true; // Key checkpoint

  async execute(context: WorkflowContext): Promise<StepResult> {
    logger.step(this.id, this.name);

    // Validate LLM configuration
    const validation = validateLLMConfig();
    if (!validation.valid) {
      return {
        success: false,
        error: `LLM configuration error: ${validation.errors.join(', ')}`,
      };
    }

    const llmClient = createLLMClient();
    const llmInfo = getLLMInfo();

    const selectedTopic = context.metadata.selectedTopic as TopicIdea | undefined;
    const outline = context.metadata.outline as Outline | undefined;
    const researchMaterials = context.metadata.researchMaterials as
      | ResearchMaterial[]
      | undefined;

    if (!outline) {
      return {
        success: false,
        error: 'No outline found. Please complete Step 4 first.',
      };
    }

    // Ask user for writing mode
    const writingMode = await promptSelect(
      'Select writing mode:',
      [
        {
          value: 'original',
          name: 'Original content (Recommended)',
          description: 'Create original content based on the outline',
        },
        {
          value: 'rewrite',
          name: 'Rewrite with references',
          description: 'Rewrite content based on research materials',
        },
        {
          value: 'expand',
          name: 'Expand outline',
          description: 'Expand the outline into full article',
        },
      ]
    );


    // Generate draft
    logger.info('Generating article draft...');

    // Load prompt manager for this account
    const accountConfig = context.metadata.accountConfig as AccountConfig | undefined;
    const promptManager = context.accountId
      ? await PromptManager.fromAccount(context.accountId, accountConfig)
      : new PromptManager();

    const researchContext = researchMaterials
      ? researchMaterials
          .map((m) => `Title: ${m.title}\n${m.content.substring(0, 800)}...`)
          .join('\n\n')
      : undefined;

    const { systemPrompt, userPrompt } = promptManager.getDraftPrompts(
      writingMode,
      {
        title: outline.title,
        sections: outline.sections,
        writingStyle: outline.writingStyle,
        tone: outline.tone,
      },
      researchContext
    );

    const response = await llmClient.generateWithRetry(
      systemPrompt,
      userPrompt,
      3
    );

    // Create article object
    const article: Article = {
      title: outline.title,
      content: response,
      author: promptManager.getAuthor(llmInfo.provider),
      createdAt: new Date().toISOString(),
      metadata: {
        topic: selectedTopic?.title || outline.title,
        keywords: selectedTopic?.keywords || [],
        wordCount: 0, // Will be calculated by formatter
        readingTime: 0, // Will be calculated by formatter
      },
    };

    // Display draft summary
    const wordCount = this.countWords(response);
    console.log(`\nDraft Generated:\n`);
    console.log(`Title: ${article.title}`);
    console.log(`Word Count: ~${wordCount}`);
    console.log(`Estimated Reading Time: ${Math.ceil(wordCount / 200)} min\n`);

    // Show first few paragraphs
    const preview = response.split('\n\n').slice(0, 3).join('\n\n');
    console.log('Preview:\n');
    console.log(preview.substring(0, 500) + '...\n');

    // Ask for confirmation
    const isAcceptable = await promptConfirm('Is this draft acceptable?', true);

    if (!isAcceptable) {
      const shouldRegenerate = await promptConfirm('Would you like to regenerate?', true);

      if (shouldRegenerate) {
        logger.info('Regenerating draft...');
        // Recursive call to regenerate
        return await this.execute(context);
      }
    }

    logger.success('Draft completed');

    // Save to file
    const outputPath = path.join(context.outputPath, '05-draft.md');
    await FileManager.writeFile(outputPath, response);

    // Store in context
    context.metadata.article = article;

    return {
      success: true,
      data: {
        article,
        wordCount,
        outputPath,
      },
      requiresUserAction: true,
    };
  }

  private countWords(content: string): number {
    // Count Chinese characters and English words
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;
    return chineseChars + englishWords;
  }
}

export default Step5Draft;

import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { createLLMClient, validateLLMConfig } from '../llm';
import { promptSelect, promptInput } from '../utils/prompts';
import { FileManager } from '../utils/file-manager';
import { PromptManager } from '../utils/prompt-manager';
import { sanitizePromptInput } from '../utils/sanitizer';
import * as path from 'path';
import type { TopicIdea } from '../types/article';
import type { AccountConfig } from '../types/account';

export class Step2Brainstorm implements Step {
  id = 2;
  name = 'Topic Brainstorming';
  description = 'Generate topic ideas using Claude AI';
  isKeyCheckpoint = false;

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

    // Load prompt manager for this account
    const accountConfig = context.metadata.accountConfig as AccountConfig | undefined;
    const promptManager = context.accountId
      ? await PromptManager.fromAccount(context.accountId, accountConfig)
      : new PromptManager();

    // Ask user for theme or direction, with account default as hint
    const defaultTheme = promptManager.getDefaultTheme();
    const rawTheme = await promptInput(
      'Enter a theme, keyword, or topic direction (or leave empty for random ideas):',
      defaultTheme || ''
    );

    // Sanitize theme input
    const { sanitized: theme, wasModified, reason } = sanitizePromptInput(rawTheme);
    if (wasModified) {
      logger.warn(`Theme input sanitized: ${reason}`);
    }

    // Generate topic ideas using PromptManager
    logger.info('Generating topic ideas...');

    const { systemPrompt, userPrompt } = promptManager.getBrainstormPrompts(theme || undefined);

    const response = await llmClient.generateWithRetry(systemPrompt, userPrompt);

    // Parse topics
    let topics: TopicIdea[];
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (error) {
      logger.error('Failed to parse topics from Claude response');
      return {
        success: false,
        error: 'Failed to parse topic ideas from AI response',
      };
    }

    // Display topics
    console.log('\nGenerated Topic Ideas:\n');
    topics.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic.title}`);
      console.log(`   ${topic.description}`);
      console.log(`   Keywords: ${topic.keywords.join(', ')}`);
      console.log('');
    });

    // Let user select or input custom topic
    const choices = [
      ...topics.map((topic, index) => ({
        value: String(index),
        name: topic.title,
      })),
      {
        value: 'custom',
        name: 'Enter a custom topic',
      },
    ];

    const selection = await promptSelect('Select a topic or enter your own:', choices);

    let selectedTopic: TopicIdea;

    if (selection === 'custom') {
      const customTitle = await promptInput('Enter your topic title:');
      const customDescription = await promptInput('Enter a brief description:');
      selectedTopic = {
        title: customTitle,
        description: customDescription,
        keywords: [],
        reasoning: 'User-defined topic',
      };
    } else {
      selectedTopic = topics[parseInt(selection)];
    }

    logger.success(`Selected topic: ${selectedTopic.title}`);

    // Save to file
    const outputPath = path.join(context.outputPath, '02-topics.json');
    await FileManager.writeJSON(outputPath, {
      generatedTopics: topics,
      selectedTopic,
    });

    // Store in context
    context.metadata.selectedTopic = selectedTopic;

    return {
      success: true,
      data: {
        selectedTopic,
        outputPath,
      },
    };
  }
}

export default Step2Brainstorm;

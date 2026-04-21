import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { createLLMClient, validateLLMConfig } from '../llm';
import { promptConfirm, promptInput } from '../utils/prompts';
import { FileManager } from '../utils/file-manager';
import { PromptManager } from '../utils/prompt-manager';
import * as path from 'path';
import type { TopicIdea, ResearchMaterial, Outline } from '../types/article';
import type { AccountConfig } from '../types/account';

export class Step4Outline implements Step {
  id = 4;
  name = 'Generate Outline';
  description = 'Create article outline with title and structure';
  isKeyCheckpoint = true; // Key checkpoint - requires user confirmation

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

    const selectedTopic = context.metadata.selectedTopic as TopicIdea | undefined;
    const researchMaterials = context.metadata.researchMaterials as
      | ResearchMaterial[]
      | undefined;

    if (!selectedTopic) {
      return {
        success: false,
        error: 'No topic selected. Please complete Step 2 first.',
      };
    }

    // Generate outline
    logger.info('Generating article outline...');

    // Load prompt manager for this account
    const accountConfig = context.metadata.accountConfig as AccountConfig | undefined;
    const promptManager = context.accountId
      ? await PromptManager.fromAccount(context.accountId, accountConfig)
      : new PromptManager();

    const researchContext = researchMaterials
      ? researchMaterials
          .map((m) => `Title: ${m.title}\nContent: ${m.content.substring(0, 500)}...`)
          .join('\n\n')
      : undefined;

    const { systemPrompt, userPrompt } = promptManager.getOutlinePrompts(
      {
        title: selectedTopic.title,
        description: selectedTopic.description,
        keywords: selectedTopic.keywords,
      },
      researchContext
    );

    const response = await llmClient.generateWithRetry(systemPrompt, userPrompt);

    // Parse outline
    let outline: Outline;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        outline = {
          title: parsed.title,
          sections: parsed.sections,
          writingStyle: parsed.writingStyle,
          tone: parsed.tone,
        };
      } else {
        throw new Error('No JSON object found in response');
      }
    } catch (error) {
      logger.error('Failed to parse outline from Claude response');
      return {
        success: false,
        error: 'Failed to parse outline from AI response',
      };
    }

    // Display outline
    console.log('\nGenerated Outline:\n');
    console.log(`Title: ${outline.title}\n`);
    outline.sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.heading}`);
      section.points.forEach((point) => {
        console.log(`   - ${point}`);
      });
    });
    console.log(`\nStyle: ${outline.writingStyle}`);
    console.log(`Tone: ${outline.tone}\n`);

    // Ask user to confirm or modify
    const isAcceptable = await promptConfirm(
      'Is this outline acceptable?',
      true
    );

    if (!isAcceptable) {
      const shouldModify = await promptConfirm(
        'Would you like to modify the outline manually?',
        true
      );

      if (shouldModify) {
        // Allow manual modifications
        const newTitle = await promptInput('Enter new title (or press Enter to keep current):');
        if (newTitle) {
          outline.title = newTitle;
        }

        const newStyle = await promptInput('Enter new writing style (or press Enter to keep current):');
        if (newStyle) {
          outline.writingStyle = newStyle;
        }

        const newTone = await promptInput('Enter new tone (or press Enter to keep current):');
        if (newTone) {
          outline.tone = newTone;
        }
      }
    }

    logger.success(`Final outline: ${outline.title}`);

    // Save to file
    const outputPath = path.join(context.outputPath, '04-outline.json');
    await FileManager.writeJSON(outputPath, outline);

    // Also save as markdown for easy viewing
    const mdOutputPath = path.join(context.outputPath, '04-outline.md');
    const mdContent = this.outlineToMarkdown(outline);
    await FileManager.writeFile(mdOutputPath, mdContent);

    // Store in context
    context.metadata.outline = outline;

    return {
      success: true,
      data: {
        outline,
        outputPath,
      },
      requiresUserAction: true, // Signal that user confirmation was required
    };
  }

  private outlineToMarkdown(outline: Outline): string {
    let md = `# ${outline.title}\n\n`;
    outline.sections.forEach((section, index) => {
      md += `## ${index + 1}. ${section.heading}\n`;
      section.points.forEach((point) => {
        md += `- ${point}\n`;
      });
      md += '\n';
    });
    md += `**Style:** ${outline.writingStyle}\n`;
    md += `**Tone:** ${outline.tone}\n`;
    return md;
  }
}

export default Step4Outline;

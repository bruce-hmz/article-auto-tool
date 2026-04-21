import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { ImageGenerator } from '../generators/image-generator';
import { FileManager } from '../utils/file-manager';
import { PromptManager } from '../utils/prompt-manager';
import * as path from 'path';
import type { Article, GeneratedImage } from '../types/article';
import type { AccountConfig } from '../types/account';

export class Step8Illustrations implements Step {
  id = 8;
  name = 'Generate Illustrations';
  description = 'Create illustrations for the article';
  isKeyCheckpoint = false;

  async execute(context: WorkflowContext): Promise<StepResult> {
    logger.step(this.id, this.name);

    const article = context.metadata.article as Article | undefined;

    if (!article) {
      return {
        success: false,
        error: 'No article found. Please complete Step 5 first.',
      };
    }

    // 检查图片生成配置
    const imageGenerator = new ImageGenerator();
    const imageConfig = imageGenerator.getConfig();
    
    logger.info(`Image generation config: provider=${imageConfig.provider}, model=${imageConfig.model}`);
    
    // 如果没有配置 API Key，跳过图片生成
    if (!imageConfig.hasApiKey) {
      logger.warn('No image generation API key configured. Skipping illustration generation.');
      
      return {
        success: true,
        data: {
          illustrations: [],
          count: 0,
          skipped: true,
          reason: 'No image generation API key configured',
        },
      };
    }

    // Get account-specific image style
    const accountConfig = context.metadata.accountConfig as AccountConfig | undefined;
    const promptManager = context.accountId
      ? await PromptManager.fromAccount(context.accountId, accountConfig)
      : new PromptManager();
    const imageStyle = promptManager.getImageStyle() || 'modern, clean, informative';

    // Ensure images directory exists
    const imagesDir = path.join(context.outputPath, 'images');
    await FileManager.ensureDir(imagesDir);

    // Extract key sections from article for illustration
    const sections = this.extractSections(article.content);
    const illustrations: GeneratedImage[] = [];

    logger.info(`Generating ${Math.min(sections.length, 3)} illustrations...`);

    // Generate up to 3 illustrations
    for (let i = 0; i < Math.min(sections.length, 3); i++) {
      const section = sections[i];
      const imagePath = path.join(imagesDir, `illustration-${i + 1}.png`);

      logger.info(`Generating illustration ${i + 1}: ${section.heading}`);

      try {
        const illustration = await imageGenerator.generateIllustration(
          section.content.substring(0, 200),
          imageStyle,
          imagePath
        );

        illustrations.push(illustration);
        logger.success(`Illustration ${i + 1} generated`);
      } catch (error) {
        logger.warn(`Failed to generate illustration ${i + 1}: ${error}`);
      }
    }

    logger.success(`Generated ${illustrations.length} illustration(s)`);

    // Store in context
    context.metadata.illustrations = illustrations;

    return {
      success: true,
      data: {
        illustrations,
        count: illustrations.length,
      },
    };
  }

  private extractSections(content: string): Array<{ heading: string; content: string }> {
    const sections: Array<{ heading: string; content: string }> = [];
    const lines = content.split('\n');

    let currentHeading = 'Introduction';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentContent.length > 0) {
          sections.push({
            heading: currentHeading,
            content: currentContent.join('\n'),
          });
        }
        currentHeading = line.replace('## ', '').trim();
        currentContent = [];
      } else if (line.trim() && !line.startsWith('#')) {
        currentContent.push(line);
      }
    }

    // Add last section
    if (currentContent.length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentContent.join('\n'),
      });
    }

    return sections;
  }
}

export default Step8Illustrations;

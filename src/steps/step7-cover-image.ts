import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { ImageGenerator } from '../generators/image-generator';
import { FileManager } from '../utils/file-manager';
import { PromptManager } from '../utils/prompt-manager';
import * as path from 'path';
import type { Article, GeneratedImage } from '../types/article';
import type { AccountConfig } from '../types/account';

export class Step7CoverImage implements Step {
  id = 7;
  name = 'Generate Cover Image';
  description = 'Create cover image for the article';
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
      logger.warn('No image generation API key configured. Skipping cover image generation.');
      logger.warn('To enable image generation, configure one of:');
      logger.warn('  - VOLCANO_API_KEY (火山引擎方舟)');
      logger.warn('  - SILICONFLOW_API_KEY (SiliconFlow)');
      
      return {
        success: true,
        data: {
          coverImage: null,
          skipped: true,
          reason: 'No image generation API key configured',
        },
      };
    }

    // Ensure images directory exists
    const imagesDir = path.join(context.outputPath, 'images');
    await FileManager.ensureDir(imagesDir);

    // Get account-specific image style
    const accountConfig = context.metadata.accountConfig as AccountConfig | undefined;
    const promptManager = context.accountId
      ? await PromptManager.fromAccount(context.accountId, accountConfig)
      : new PromptManager();
    const imageStyle = promptManager.getImageStyle() || 'modern, professional, eye-catching';

    // Generate cover image
    const coverImagePath = path.join(imagesDir, 'cover.png');

    logger.info(`Generating cover image for: ${article.title}`);

    try {
      const coverImage = await imageGenerator.generateCoverImage(
        article.title,
        imageStyle,
        coverImagePath
      );

      logger.success(`Cover image generated: ${coverImagePath}`);

      // Store in context
      context.metadata.coverImage = coverImage;

      return {
        success: true,
        data: {
          coverImage,
          outputPath: coverImagePath,
        },
      };
    } catch (error) {
      logger.error('Failed to generate cover image, but continuing workflow');
      logger.error(error instanceof Error ? error.message : String(error));
      
      // 不阻断工作流，返回成功但标记为跳过
      return {
        success: true,
        data: {
          coverImage: null,
          skipped: true,
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

export default Step7CoverImage;

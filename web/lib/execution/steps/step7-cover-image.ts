/**
 * Step 7: Cover Image (Web Implementation)
 *
 * Creates cover image for the article.
 * Requires user interaction only if API key is not configured.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
  InteractionRequest,
} from '../../types/step-execution'
import { ImageGenerator } from '../../../../src/generators/image-generator'
import { PromptManager } from '../../../../src/utils/prompt-manager'
import { FileManager } from '../../file-manager'
import * as path from 'path'
import type { AccountConfig } from '../../../../src/types/account'

interface GeneratedImage {
  path: string
  prompt: string
  timestamp: string
}

export class Step7CoverImage implements StepHandler {
  id = 7
  name = 'Generate Cover Image'
  description = 'Create cover image for the article'
  isKeyCheckpoint = false

  async execute(
    context: WebExecutionContext,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult> {
    emitEvent({
      type: 'progress',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: 'Generating cover image...',
      },
    })

    // Check if image generation is available
    let imageGenerator: ImageGenerator
    try {
      imageGenerator = new ImageGenerator()
    } catch (error) {
      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'Image generation not configured. Skipping cover image.',
        },
      })

      return {
        success: true,
        data: {
          coverImage: null,
          skipped: true,
          reason: 'Image generation not configured',
        },
      }
    }

    // Get article info
    const article = context.metadata.article || context.metadata.formattedArticle
    if (!article) {
      return {
        success: false,
        error: 'No article found. Please complete Step 5 first.',
      }
    }

    const title = article.title || 'Article'

    // Get account-specific image style
    const accountConfig = context.metadata.accountConfig as AccountConfig | undefined
    const briefData = context.metadata.editorialBrief as Record<string, unknown> | undefined
    const promptManager = context.accountId && accountConfig
      ? PromptManager.fromBrief(accountConfig, briefData)
      : new PromptManager()
    const imageStyle = promptManager.getImageStyle() || 'modern minimalist'

    // Ensure images directory exists
    const imagesDir = path.join(context.outputPath, 'images')
    await FileManager.ensureDir(imagesDir)

    const coverImagePath = path.join(imagesDir, 'cover.png')

    try {
      // Generate image prompt based on article
      const prompt = this.generatePrompt(title, article.content?.substring(0, 500) || '')

      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `Generating image with prompt: ${prompt.substring(0, 100)}...`,
        },
      })

      // Generate the image
      const generatedImage = await imageGenerator.generateCoverImage(prompt, imageStyle, coverImagePath)

      const coverImage: GeneratedImage = {
        path: coverImagePath,
        prompt,
        timestamp: new Date().toISOString(),
      }

      // Save metadata
      const metadataPath = path.join(imagesDir, 'cover-meta.json')
      await FileManager.writeJSON(metadataPath, coverImage)

      // Update context
      context.metadata.coverImage = coverImage

      emitEvent({
        type: 'completed',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'Cover image generated successfully',
          result: {
            imagePath: coverImagePath,
          },
        },
      })

      return {
        success: true,
        data: {
          coverImage,
          imagePath: coverImagePath,
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `Cover image generation failed: ${errorMessage}`,
        },
      })

      // Continue without cover image
      return {
        success: true,
        data: {
          coverImage: null,
          skipped: true,
          reason: errorMessage,
        },
      }
    }
  }

  private generatePrompt(title: string, content: string): string {
    // Extract key themes from content
    const keywords = this.extractKeywords(content)

    return `Create a professional cover image for an article titled "${title}".
      The image should be modern, clean, and visually appealing.
      Style: Minimalist design with abstract elements.
      Keywords: ${keywords.slice(0, 5).join(', ')}.
      Format: Suitable for social media sharing, 16:9 aspect ratio.`
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase().split(/\s+/)
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just'])

    const wordFreq: Record<string, number> = {}
    for (const word of words) {
      const cleaned = word.replace(/[^a-z\u4e00-\u9fa5]/g, '')
      if (cleaned.length > 2 && !stopWords.has(cleaned)) {
        wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1
      }
    }

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }
}

export default Step7CoverImage

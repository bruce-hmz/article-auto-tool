/**
 * Step 8: Illustrations (Web Implementation)
 *
 * Generates illustrations for the article.
 * Requires user interaction only if API key is not configured.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
} from '../../types/step-execution'
import { ImageGenerator } from '../../../../src/generators/image-generator'
import { PromptManager } from '../../../../src/utils/prompt-manager'
import { FileManager } from '../../file-manager'
import * as path from 'path'
import type { AccountConfig } from '../../../../src/types/account'

interface GeneratedImage {
  path: string
  prompt: string
  sectionHeading: string
  timestamp: string
}

export class Step8Illustrations implements StepHandler {
  id = 8
  name = 'Generate Illustrations'
  description = 'Generate illustrations for the article'
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
        message: 'Generating illustrations...',
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
          message: 'Image generation not configured. Skipping illustrations.',
        },
      })

      return {
        success: true,
        data: {
          illustrations: [],
          skipped: true,
          reason: 'Image generation not configured',
        },
      }
    }

    // Get article
    const article = context.metadata.article || context.metadata.formattedArticle
    if (!article || !article.content) {
      return {
        success: false,
        error: 'No article found. Please complete Step 5 first.',
      }
    }

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

    // Extract sections from article
    const sections = this.extractSections(article.content)
    const illustrations: GeneratedImage[] = []

    emitEvent({
      type: 'log',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: `Found ${sections.length} sections for illustration`,
      },
    })

    // Generate illustrations for up to 3 sections
    const sectionsToIllustrate = sections.slice(0, 3)

    for (let i = 0; i < sectionsToIllustrate.length; i++) {
      const section = sectionsToIllustrate[i]

      try {
        emitEvent({
          type: 'progress',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Generating illustration ${i + 1}/${sectionsToIllustrate.length}...`,
          },
        })

        const imagePath = path.join(imagesDir, `illustration-${i + 1}.png`)
        const prompt = this.generatePrompt(section.heading, section.content)

        await imageGenerator.generateIllustration(prompt, imageStyle, imagePath)

        illustrations.push({
          path: imagePath,
          prompt,
          sectionHeading: section.heading,
          timestamp: new Date().toISOString(),
        })

        emitEvent({
          type: 'log',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Generated illustration for: ${section.heading}`,
          },
        })
      } catch (error) {
        emitEvent({
          type: 'log',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Failed to generate illustration for ${section.heading}: ${error}`,
          },
        })
      }
    }

    // Save metadata
    const metadataPath = path.join(imagesDir, 'illustrations-meta.json')
    await FileManager.writeJSON(metadataPath, illustrations)

    // Update context
    context.metadata.illustrations = illustrations

    emitEvent({
      type: 'completed',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: `Generated ${illustrations.length} illustrations`,
        result: {
          count: illustrations.length,
        },
      },
    })

    return {
      success: true,
      data: {
        illustrations,
        count: illustrations.length,
      },
    }
  }

  private extractSections(content: string): Array<{ heading: string; content: string }> {
    const sections: Array<{ heading: string; content: string }> = []
    const lines = content.split('\n')

    let currentHeading = ''
    let currentContent = ''

    for (const line of lines) {
      const headingMatch = line.match(/^##\s+(.+)$/)
      if (headingMatch) {
        // Save previous section
        if (currentHeading && currentContent.trim()) {
          sections.push({ heading: currentHeading, content: currentContent.trim() })
        }
        currentHeading = headingMatch[1]
        currentContent = ''
      } else if (currentHeading) {
        currentContent += line + '\n'
      }
    }

    // Save last section
    if (currentHeading && currentContent.trim()) {
      sections.push({ heading: currentHeading, content: currentContent.trim() })
    }

    return sections
  }

  private generatePrompt(heading: string, content: string): string {
    // Extract key terms from content
    const keywords = this.extractKeywords(content)

    return `Create an illustration for a section titled "${heading}".
      The image should complement the article content.
      Keywords: ${keywords.slice(0, 5).join(', ')}.
      Style: Clean, professional, suitable for a blog article.
      Format: Square aspect ratio, high quality.`
  }

  private extractKeywords(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/)
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'and', 'but', 'or', 'so', 'yet', 'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just'])

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

export default Step8Illustrations

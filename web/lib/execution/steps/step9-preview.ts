/**
 * Step 9: Preview (Web Implementation)
 *
 * Reviews article and prepares for publishing.
 * Requires user confirmation at key checkpoint mode pause
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
  InteractionRequest,
} from '../../types/step-execution'
import { FileManager } from '../../file-manager'
import * as path from 'path'

interface FormattedArticle {
  title: string
  content: string
  html?: string
  wordCount: number
  readingTime: number
}

interface GeneratedImage {
  path: string
  prompt: string
  timestamp?: string
}

// Phase tracking for multi-stage interaction
const stepPhases = new Map<string, number>()

export class Step9Preview implements StepHandler {
  id = 9
  name = 'Preview'
  description = 'Review article before publishing'
  isKeyCheckpoint = true

  async execute(
    context: WebExecutionContext,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult> {
    const workflowId = context.workflowId
    let phase = stepPhases.get(workflowId) || 0

    // Get article from context
    const article = context.metadata.formattedArticle as FormattedArticle | undefined
    if (!article) {
      return {
        success: false,
        error: 'No formatted article found. Please complete Step 6 first.',
      }
    }

    // Get cover image if available
    const coverImage = context.metadata.coverImage as GeneratedImage | undefined
    const illustrations = context.metadata.illustrations as GeneratedImage[] | undefined

    // Phase 0: Show preview and ask for confirmation
    if (phase === 0) {
      // Generate digest
      const digest = this.generateDigest(article.content)

      // Save preview HTML
      const htmlOutputPath = path.join(context.outputPath, '09-preview.html')
      const previewHtml = this.generatePreviewHtml(article, coverImage)
      await FileManager.writeFile(htmlOutputPath, previewHtml)

      // Store publishing info
      context.metadata.publishingInfo = {
        title: article.title,
        digest,
        wordCount: article.wordCount,
        readingTime: article.readingTime,
        hasCoverImage: !!coverImage,
        illustrationsCount: illustrations?.length || 0,
      }

      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `Article preview ready (${article.wordCount} words, ~${article.readingTime} min read)`,
        },
      })

      // Ask for confirmation
      stepPhases.set(workflowId, 1)
      return {
        success: true,
        requiresInteraction: true,
        interaction: {
          type: 'select',
          message: `Article Preview:\n\nTitle: ${article.title}\nWords: ${article.wordCount}\nReading Time: ~${article.readingTime} min\nCover Image: ${coverImage ? 'Yes' : 'No'}\nIllustrations: ${illustrations?.length || 0}\n\nReady to publish?`,
          stepId: this.id,
          stepName: this.name,
          options: {
            choices: [
              { value: 'publish', label: 'Yes, proceed to publish' },
              { value: 'review', label: 'I need to make changes' },
              { value: 'cancel', label: 'Cancel workflow' },
            ],
          },
        },
      }
    }

    // Phase 1: Handle user decision
    if (phase === 1) {
      const choice = context.userInput?.value as string

      if (choice === 'publish') {
        stepPhases.delete(workflowId)

        emitEvent({
          type: 'completed',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: 'Article approved for publishing',
            result: {
              readyToPublish: true,
            },
          },
        })

        return {
          success: true,
          data: {
            readyToPublish: true,
            previewPath: path.join(context.outputPath, '09-preview.html'),
          },
        }
      }

      if (choice === 'review') {
        stepPhases.set(workflowId, 2)
        return {
          success: true,
          requiresInteraction: true,
          interaction: {
            type: 'input',
            message: 'Describe the changes you want to make:',
            stepId: this.id,
            stepName: this.name,
            options: {
              placeholder: 'e.g., Change the title, add more content to section 2...',
            },
          },
        }
      }

      if (choice === 'cancel') {
        stepPhases.delete(workflowId)
        return {
          success: true,
          data: {
            cancelled: true,
            message: 'Workflow cancelled by user',
          },
        }
      }
    }

    // Phase 2: Handle review request
    if (phase === 2) {
      const reviewNotes = context.userInput?.value as string

      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `Review notes: ${reviewNotes}`,
        },
      })

      // Save review notes for manual review
      const reviewPath = path.join(context.outputPath, '09-review-notes.txt')
      await FileManager.writeFile(reviewPath, reviewNotes)

      // For now, we'll just proceed - in a full implementation, this would
      // trigger re-generation of specific parts
      stepPhases.delete(workflowId)

      return {
        success: true,
        data: {
          reviewRequested: true,
          reviewNotes,
          message: 'Review notes saved. Please manually edit the article if needed.',
        },
      }
    }

    // Default: restart
    stepPhases.delete(workflowId)
    return {
      success: false,
      error: 'Unknown phase in preview',
    }
  }

  private generateDigest(content: string): string {
    // Remove markdown formatting
    const plainText = content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\n/g, ' ')
      .trim()

    // Limit to 120 characters, find last complete sentence
    let digest = plainText.substring(0, 120)
    const lastPeriod = digest.lastIndexOf('。')
    const lastQuestion = digest.lastIndexOf('？')
    const lastExclamation = digest.lastIndexOf('！')
    const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation)

    if (lastSentenceEnd > 50) {
      return digest.substring(0, lastSentenceEnd + 1)
    }
    return digest + '...'
  }

  private generatePreviewHtml(article: FormattedArticle, coverImage?: GeneratedImage): string {
    const coverImageTag = coverImage
      ? `<img src="${coverImage.path}" alt="Cover Image" style="max-width: 100%; height: auto; margin-bottom: 20px;">`
      : ''

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${article.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.8;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1 {
      font-size: 2em;
      margin-bottom: 0.5em;
      color: #111;
    }
    h2 {
      font-size: 1.5em;
      margin-top: 2em;
      color: #222;
    }
    h3 {
      font-size: 1.25em;
      margin-top: 1.5em;
      color: #333;
    }
    p {
      margin: 1em 0;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'SF Mono', Consolas, monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin-left: 0;
      padding-left: 20px;
      color: #666;
    }
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 2em;
      padding-bottom: 1em;
      border-bottom: 1px solid #eee;
    }
  </style>
</head>
<body>
  ${coverImageTag}
  <h1>${article.title}</h1>
  <div class="meta">
    ${article.wordCount} words · ${article.readingTime} min read
  </div>
  ${this.markdownToHtml(article.content)}
</body>
</html>`
  }

  private markdownToHtml(markdown: string): string {
    let html = markdown

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>')
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

    // Paragraphs
    html = html.split('\n\n').map((para) => {
      if (!para.trim()) return ''
      if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<pre')) {
        return para
      }
      return `<p>${para.replace(/\n/g, '<br>')}</p>`
    }).join('\n')

    return html
  }
}

export default Step9Preview

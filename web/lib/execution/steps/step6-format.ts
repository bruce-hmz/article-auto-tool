/**
 * Step 6: Format Text (Web Implementation)
 *
 * Formats article with proper Markdown structure.
 * No user interaction required.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
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

export class Step6Format implements StepHandler {
  id = 6
  name = 'Format Text'
  description = 'Format article with proper Markdown structure'
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
        message: 'Formatting article...',
      },
    })

    // Get article from context
    const article = context.metadata.article
    if (!article || !article.content) {
      return {
        success: false,
        error: 'No article found. Please complete Step 5 first.',
      }
    }

    try {
      const content = article.content
      const title = article.title || 'Untitled'

      // Simple formatting: ensure proper structure
      let formattedContent = content

      // Ensure title is H1
      if (!formattedContent.startsWith('# ')) {
        formattedContent = `# ${title}\n\n${formattedContent}`
      }

      // Calculate word count (Chinese + English)
      const chineseChars = (formattedContent.match(/[\u4e00-\u9fa5]/g) || []).length
      const englishWords = (formattedContent.match(/[a-zA-Z]+/g) || []).length
      const wordCount = chineseChars + englishWords

      // Calculate reading time (assuming 300 words per minute)
      const readingTime = Math.max(1, Math.ceil(wordCount / 300))

      // Simple markdown to HTML conversion
      const html = this.markdownToHtml(formattedContent)

      const formattedArticle: FormattedArticle = {
        title,
        content: formattedContent,
        html,
        wordCount,
        readingTime,
      }

      // Save formatted article
      const outputPath = path.join(context.outputPath, '06-formatted.json')
      await FileManager.writeJSON(outputPath, formattedArticle)

      // Also save HTML version
      const htmlPath = path.join(context.outputPath, '06-formatted.html')
      await FileManager.writeFile(htmlPath, html)

      // Update context
      context.metadata.formattedArticle = formattedArticle

      emitEvent({
        type: 'completed',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `Article formatted (${wordCount} words, ~${readingTime} min read)`,
          result: {
            wordCount,
            readingTime,
          },
        },
      })

      return {
        success: true,
        data: {
          formattedArticle,
          outputPath,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to format article: ${error}`,
      }
    }
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

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Article</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { margin-top: 1.5em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 20px; color: #666; }
  </style>
</head>
<body>
${html}
</body>
</html>`
  }
}

export default Step6Format

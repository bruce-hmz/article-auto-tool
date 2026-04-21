import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { MarkdownFormatter } from '../generators/markdown-formatter';
import { FileManager } from '../utils/file-manager';
import * as path from 'path';
import type { Article, FormattedArticle } from '../types/article';

export class Step6Format implements Step {
  id = 6;
  name = 'Format Text';
  description = 'Format article with proper Markdown structure';
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

    const formatter = new MarkdownFormatter();
    const formatted: FormattedArticle = formatter.format(article);

    logger.success(`Article formatted (${formatted.metadata.wordCount} words, ~${formatted.metadata.readingTime} min read)`);

    // Save formatted markdown
    const outputPath = path.join(context.outputPath, '06-formatted.md');
    await FileManager.writeFile(outputPath, formatted.markdown);

    // Store in context
    context.metadata.formattedArticle = formatted;

    return {
      success: true,
      data: {
        formatted,
        outputPath,
      },
    };
  }
}

export default Step6Format;

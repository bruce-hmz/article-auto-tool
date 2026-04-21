import { logger } from '../utils/logger';
import type { Article, FormattedArticle, ArticleMetadata } from '../types';

export class MarkdownFormatter {
  format(article: Article): FormattedArticle {
    logger.info('Formatting article...');

    // Add frontmatter
    let markdown = this.addFrontmatter(article);

    // Optimize headings
    markdown = this.optimizeHeadings(markdown);

    // Add Chinese-English spacing
    markdown = this.addChineseEnglishSpacing(markdown);

    // Optimize paragraphs
    markdown = this.optimizeParagraphs(markdown);

    const metadata: ArticleMetadata = {
      topic: article.metadata.topic,
      keywords: article.metadata.keywords,
      wordCount: this.countWords(markdown),
      readingTime: Math.ceil(this.countWords(markdown) / 200), // 200 words per minute
    };

    logger.success('Article formatted');

    return {
      markdown,
      html: '', // Will be generated separately
      metadata,
    };
  }

  private addFrontmatter(article: Article): string {
    const frontmatter = `---
title: "${article.title}"
author: "${article.author || 'Claude AI'}"
date: "${article.createdAt}"
keywords: ${article.metadata.keywords.join(', ')}
reading_time: ${article.metadata.readingTime} min
---

`;
    return frontmatter + article.content;
  }

  private optimizeHeadings(content: string): string {
    // Ensure proper heading hierarchy
    const lines = content.split('\n');
    const optimized = lines.map((line) => {
      // Remove multiple # signs at the start
      if (line.match(/^#{7,}\s/)) {
        return line.replace(/^#{7,}\s/, '###### ');
      }
      return line;
    });

    return optimized.join('\n');
  }

  private addChineseEnglishSpacing(content: string): string {
    // Add space between Chinese and English text
    return content
      .replace(/([\u4e00-\u9fa5])([a-zA-Z0-9])/g, '$1 $2')
      .replace(/([a-zA-Z0-9])([\u4e00-\u9fa5])/g, '$1 $2');
  }

  private optimizeParagraphs(content: string): string {
    // Ensure proper paragraph breaks
    return content
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .trim();
  }

  private countWords(content: string): number {
    // Remove frontmatter
    const contentWithoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, '');

    // Count Chinese characters and English words
    const chineseChars = (contentWithoutFrontmatter.match(/[\u4e00-\u9fa5]/g) || [])
      .length;
    const englishWords = (
      contentWithoutFrontmatter.match(/[a-zA-Z]+/g) || []
    ).length;

    return chineseChars + englishWords;
  }
}

export default MarkdownFormatter;

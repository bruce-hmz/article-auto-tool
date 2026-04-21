import axios from 'axios';
import { logger } from '../utils/logger';

export interface URLContent {
  url: string;
  title: string;
  content: string;
  error?: string;
}

export class URLFetcher {
  private timeout: number;

  constructor(timeout: number = 30000) {
    this.timeout = timeout;
  }

  async fetch(url: string): Promise<URLContent> {
    logger.info(`Fetching URL: ${url}`);

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WeChatArticleBot/1.0)',
        },
      });

      const html = response.data;

      // Extract title
      const title = this.extractTitle(html);

      // Extract main content
      const content = this.extractContent(html);

      logger.success(`Fetched: ${title}`);

      return {
        url,
        title,
        content,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to fetch ${url}`, error);

      return {
        url,
        title: '',
        content: '',
        error: errorMessage,
      };
    }
  }

  async fetchMultiple(urls: string[]): Promise<URLContent[]> {
    const results = await Promise.all(urls.map((url) => this.fetch(url)));
    return results;
  }

  private extractTitle(html: string): string {
    // Try to extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    // Try to extract from <h1>
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      return h1Match[1].trim();
    }

    return 'Untitled';
  }

  private extractContent(html: string): string {
    // Simple content extraction - remove HTML tags and scripts
    let content = html;

    // Remove scripts and styles
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    content = content.replace(/<[^>]+>/g, ' ');

    // Remove extra whitespace
    content = content.replace(/\s+/g, ' ').trim();

    // Limit content length
    if (content.length > 10000) {
      content = content.substring(0, 10000) + '...';
    }

    return content;
  }
}

export default URLFetcher;

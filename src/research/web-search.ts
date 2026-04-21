/**
 * Web Search Implementation
 * 支持多种搜索提供商：
 * - DuckDuckGo（免费，无需 API Key）- 在中国大陆可能无法访问
 * - Bing Web Search（有免费额度，需要 API Key）- 在中国大陆可用
 * - Tavily（有免费额度，需要 API Key）- 搜索质量较好
 */

import { logger } from '../utils/logger';
import axios from 'axios';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export type SearchProvider = 'duckduckgo' | 'bing' | 'tavily';

export class WebSearch {
  private provider: SearchProvider;
  private bingApiKey?: string;
  private tavilyApiKey?: string;

  constructor(options?: { 
    provider?: SearchProvider; 
    bingApiKey?: string;
    tavilyApiKey?: string;
  }) {
    // 从环境变量读取配置
    this.bingApiKey = options?.bingApiKey || process.env.BING_API_KEY;
    this.tavilyApiKey = options?.tavilyApiKey || process.env.TAVILY_API_KEY;
    
    // 确定使用的搜索提供商
    this.provider = options?.provider || (process.env.SEARCH_PROVIDER as SearchProvider) || 'duckduckgo';
    
    // 如果没有显式指定 provider，自动选择可用的
    if (!options?.provider && !process.env.SEARCH_PROVIDER) {
      if (this.bingApiKey) {
        this.provider = 'bing';
      } else if (this.tavilyApiKey) {
        this.provider = 'tavily';
      }
      // 否则使用 DuckDuckGo（可能需要代理）
    }
  }

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    logger.info(`Searching for: ${query} (provider: ${this.provider})`);

    switch (this.provider) {
      case 'bing':
        return this.searchWithBing(query, maxResults);
      case 'tavily':
        return this.searchWithTavily(query, maxResults);
      case 'duckduckgo':
      default:
        return this.searchWithDuckDuckGo(query, maxResults);
    }
  }

  /**
   * Bing 搜索（需要 API Key，有免费额度 1000次/月）
   * 获取 API Key: https://portal.azure.com/ → Bing Search v7
   */
  private async searchWithBing(query: string, maxResults: number): Promise<SearchResult[]> {
    if (!this.bingApiKey) {
      logger.warn('Bing API key not configured, falling back to DuckDuckGo');
      return this.searchWithDuckDuckGo(query, maxResults);
    }

    try {
      const response = await axios.get(
        'https://api.bing.microsoft.com/v7.0/search',
        {
          params: {
            q: query,
            count: maxResults,
            responseFilter: 'Webpages',
          },
          headers: {
            'Ocp-Apim-Subscription-Key': this.bingApiKey,
          },
          timeout: 15000,
        }
      );

      const webPages = response.data.webPages?.value || [];
      
      return webPages.map((page: { name?: string; url?: string; snippet?: string }) => ({
        title: page.name || 'Untitled',
        url: page.url || '',
        snippet: page.snippet || '',
      }));
    } catch (error) {
      logger.error('Bing search failed:', error);
      // 降级到 DuckDuckGo
      logger.info('Falling back to DuckDuckGo...');
      return this.searchWithDuckDuckGo(query, maxResults);
    }
  }


  /**
   * DuckDuckGo 搜索（免费，无需 API Key）
   */
  private async searchWithDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
    try {
      // 使用 duckduckgo-search 库
      const { text } = await import('duckduckgo-search');
      
      const results = await text(query, { max_results: maxResults });
      
      return results.map((result: { title?: string; href?: string; body?: string }) => ({
        title: result.title || 'Untitled',
        url: result.href || '',
        snippet: result.body || '',
      }));
    } catch (error) {
      // 如果 duckduckgo-search 失败，尝试使用备用的 HTML 抓取方式
      logger.warn('DuckDuckGo search failed, trying alternative method...');
      return this.searchWithDuckDuckGoFallback(query, maxResults);
    }
  }

  /**
   * DuckDuckGo 备用方法（直接抓取 HTML）
   */
  private async searchWithDuckDuckGoFallback(query: string, maxResults: number): Promise<SearchResult[]> {
    try {
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: query },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
        timeout: 15000,
      });

      const html = response.data as string;
      const results: SearchResult[] = [];
      
      // 解析 DuckDuckGo HTML 结果
      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      
      let match;
      while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
        const url = this.extractRedirectUrl(match[1]);
        const title = this.stripHtml(match[2]);
        const snippet = this.stripHtml(match[3]);
        
        if (url && title) {
          results.push({ title, url, snippet });
        }
      }

      if (results.length === 0) {
        logger.warn('No results found from DuckDuckGo');
      }

      return results;
    } catch (error) {
      logger.error('DuckDuckGo search failed. If you are in China, you may need to:');
      logger.error('  1. Configure BING_API_KEY for Bing search (recommended)');
      logger.error('  2. Configure TAVILY_API_KEY for Tavily search');
      logger.error('  3. Use a VPN/Proxy for DuckDuckGo');
      return [];
    }
  }

  /**
   * Tavily 搜索（需要 API Key，有免费额度）
   */
  private async searchWithTavily(query: string, maxResults: number): Promise<SearchResult[]> {
    if (!this.tavilyApiKey) {
      logger.warn('Tavily API key not configured, falling back to DuckDuckGo');
      return this.searchWithDuckDuckGo(query, maxResults);
    }

    try {
      const response = await axios.post(
        'https://api.tavily.com/search',
        {
          api_key: this.tavilyApiKey,
          query,
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      const results = response.data.results || [];
      
      return results.map((result: { title?: string; url?: string; content?: string }) => ({
        title: result.title || 'Untitled',
        url: result.url || '',
        snippet: result.content || '',
      }));
    } catch (error) {
      logger.error('Tavily search failed:', error);
      // 降级到 DuckDuckGo
      logger.info('Falling back to DuckDuckGo...');
      return this.searchWithDuckDuckGo(query, maxResults);
    }
  }

  /**
   * 从 DuckDuckGo 重定向 URL 中提取真实 URL
   */
  private extractRedirectUrl(redirectUrl: string): string {
    try {
      const url = new URL(redirectUrl, 'https://duckduckgo.com');
      const uddg = url.searchParams.get('uddg');
      return uddg || redirectUrl;
    } catch {
      return redirectUrl;
    }
  }

  /**
   * 移除 HTML 标签
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  async searchWithRetry(
    query: string,
    maxResults: number = 5,
    maxRetries: number = 3
  ): Promise<SearchResult[]> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.search(query, maxResults);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Search attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('All search attempts failed, returning empty results');
    return [];
  }
}

export default WebSearch;

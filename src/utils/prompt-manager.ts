import * as path from 'path';
import * as fs from 'fs/promises';
import { FileManager } from './file-manager';
import { logger } from './logger';
import type { AccountConfig } from '../types/account';

export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
}

export interface EditorialBrief {
  voice?: string;
  audience?: string;
  tone?: 'formal' | 'casual' | 'mixed';
  topicDomains?: {
    include?: string[];
    exclude?: string[];
  };
  promptOverrides?: Record<string, Partial<PromptTemplate>>;
}

const DEFAULT_BRIEF: EditorialBrief = {};

export class PromptManager {
  private brief: EditorialBrief;
  private accountId?: string;
  private accountName?: string;
  private accountConfig?: AccountConfig;

  constructor(accountId?: string, accountConfig?: AccountConfig, brief?: EditorialBrief) {
    this.accountId = accountId;
    this.accountConfig = accountConfig;
    this.accountName = accountConfig?.name;
    this.brief = brief || DEFAULT_BRIEF;
  }

  /**
   * Load editorial brief from config/accounts/{accountId}-brief.json
   */
  static async fromAccount(accountId: string, accountConfig?: AccountConfig): Promise<PromptManager> {
    let brief: EditorialBrief = DEFAULT_BRIEF;

    if (accountId) {
      const briefPath = path.join('config', 'accounts', `${accountId}-brief.json`);
      try {
        const exists = await FileManager.exists(briefPath);
        if (exists) {
          const raw = await FileManager.readFile(briefPath);
          brief = JSON.parse(raw);
          logger.debug(`Loaded editorial brief for account: ${accountId}`);
        }
      } catch (error) {
        logger.warn(`Failed to load editorial brief for ${accountId}, using defaults`);
      }
    }

    return new PromptManager(accountId, accountConfig, brief);
  }

  /**
   * Get the brainstorm (step 2) prompts, with account overrides applied.
   */
  getBrainstormPrompts(theme?: string): PromptTemplate {
    const defaults = this.defaultBrainstormPrompts(theme);
    return this.applyOverrides('step2-brainstorm', defaults);
  }

  /**
   * Get the outline (step 4) prompts.
   */
  getOutlinePrompts(topic: { title: string; description: string; keywords: string[] }, researchContext?: string): PromptTemplate {
    const defaults = this.defaultOutlinePrompts(topic, researchContext);
    return this.applyOverrides('step4-outline', defaults);
  }

  /**
   * Get the draft (step 5) prompts based on writing mode.
   */
  getDraftPrompts(
    mode: 'original' | 'rewrite' | 'expand',
    outline: { title: string; sections: Array<{ heading: string; points: string[] }>; writingStyle: string; tone: string },
    researchContext?: string
  ): PromptTemplate {
    const defaults = this.defaultDraftPrompts(mode, outline, researchContext);
    return this.applyOverrides('step5-draft', defaults);
  }

  /**
   * Get the configured author name for the account.
   */
  getAuthor(fallbackProvider?: string): string {
    const configAuthor = this.accountConfig?.config?.publishing?.defaultAuthor;
    if (configAuthor) return configAuthor;
    if (fallbackProvider) return `AI (${fallbackProvider})`;
    return 'AI';
  }

  /**
   * Get the default theme for the account.
   */
  getDefaultTheme(): string | undefined {
    return this.accountConfig?.config?.defaultTheme;
  }

  /**
   * Get the image style for the account.
   */
  getImageStyle(): string | undefined {
    return this.accountConfig?.config?.imageStyle;
  }

  /**
   * Build editorial context string to inject into prompts.
   * This encodes the account's voice, audience, and tone preferences.
   */
  getEditorialContext(): string {
    const parts: string[] = [];

    if (this.brief.voice) {
      parts.push(`Voice: ${this.brief.voice}`);
    }
    if (this.brief.audience) {
      parts.push(`Target Audience: ${this.brief.audience}`);
    }
    if (this.brief.tone) {
      parts.push(`Tone: ${this.brief.tone}`);
    }
    if (this.brief.topicDomains?.include?.length) {
      parts.push(`Preferred topics: ${this.brief.topicDomains.include.join(', ')}`);
    }
    if (this.brief.topicDomains?.exclude?.length) {
      parts.push(`Avoid topics: ${this.brief.topicDomains.exclude.join(', ')}`);
    }

    return parts.length > 0
      ? `\n\nEditorial Guidelines:\n${parts.map(p => `- ${p}`).join('\n')}`
      : '';
  }

  private applyOverrides(stepKey: string, defaults: PromptTemplate): PromptTemplate {
    const overrides = this.brief.promptOverrides?.[stepKey];
    if (!overrides) return defaults;

    return {
      systemPrompt: overrides.systemPrompt || defaults.systemPrompt,
      userPrompt: overrides.userPrompt || defaults.userPrompt,
    };
  }

  private defaultBrainstormPrompts(theme?: string): PromptTemplate {
    const editorialCtx = this.getEditorialContext();

    const systemPrompt = `You are an expert content strategist for WeChat official accounts. Your task is to generate engaging, relevant, and timely topic ideas that will resonate with Chinese readers.

Consider:
- Current trends and hot topics
- Reader interests and pain points
- Educational or entertaining value
- Shareability and engagement potential${editorialCtx}`;

    const userPrompt = theme
      ? `Generate 5 creative and engaging article topic ideas related to "${theme}". For each topic, provide:
1. A catchy title
2. A brief description (2-3 sentences)
3. 3-5 relevant keywords
4. Why this topic would be interesting to readers

Format your response as JSON array with objects containing: title, description, keywords (array), reasoning`
      : `Generate 5 creative and engaging article topic ideas across different categories (technology, lifestyle, business, culture, etc.). For each topic, provide:
1. A catchy title
2. A brief description (2-3 sentences)
3. 3-5 relevant keywords
4. Why this topic would be interesting to readers

Format your response as JSON array with objects containing: title, description, keywords (array), reasoning`;

    return { systemPrompt, userPrompt };
  }

  private defaultOutlinePrompts(
    topic: { title: string; description: string; keywords: string[] },
    researchContext?: string
  ): PromptTemplate {
    const editorialCtx = this.getEditorialContext();
    const research = researchContext
      ? `\n\nReference materials:\n${researchContext}`
      : '';

    const systemPrompt = `You are an expert article outliner for WeChat official accounts. Your task is to create a clear, logical, and engaging outline that will guide the article writing process.

Consider:
- A compelling title that captures attention
- Logical flow and structure
- Key points and arguments
- Appropriate length (typically 1500-3000 words)
- Reader engagement and retention${editorialCtx}`;

    const userPrompt = `Create an outline for an article on the following topic:

Title: ${topic.title}
Description: ${topic.description}
Keywords: ${topic.keywords.join(', ')}
${research}

Provide:
1. A refined, compelling article title (can be different from topic title)
2. 3-5 main sections with headings
3. 2-4 key points for each section
4. Suggested writing style (formal/casual/technical/etc.)
5. Suggested tone (educational/entertaining/persuasive/etc.)

Format your response as JSON:
{
  "title": "Article title",
  "sections": [
    {
      "heading": "Section heading",
      "points": ["Point 1", "Point 2", "Point 3"]
    }
  ],
  "writingStyle": "style description",
  "tone": "tone description"
}`;

    return { systemPrompt, userPrompt };
  }

  private defaultDraftPrompts(
    mode: 'original' | 'rewrite' | 'expand',
    outline: { title: string; sections: Array<{ heading: string; points: string[] }>; writingStyle: string; tone: string },
    researchContext?: string
  ): PromptTemplate {
    const editorialCtx = this.getEditorialContext();

    const systemPrompt = `You are an expert article writer for WeChat official accounts. Your task is to write a high-quality, engaging, and well-structured article based on the provided outline.

Guidelines:
- Write in clear, engaging Chinese
- Maintain the specified writing style and tone
- Use appropriate examples and explanations
- Ensure logical flow between sections
- Optimize for readability and retention
- Include a compelling introduction and conclusion
- Total length should be 1500-3000 words${editorialCtx}`;

    const outlineText = outline.sections
      .map((s, i) => `${i + 1}. ${s.heading}\n${s.points.map(p => `  - ${p}`).join('\n')}`)
      .join('\n\n');

    const research = researchContext
      ? `\n${researchContext}`
      : '';

    let userPrompt: string;

    if (mode === 'original') {
      userPrompt = `Write an original article based on the following outline:

Title: ${outline.title}

Outline:
${outlineText}

Writing Style: ${outline.writingStyle}
Tone: ${outline.tone}

Write the complete article in Markdown format with proper headings, paragraphs, and structure.`;
    } else if (mode === 'rewrite') {
      userPrompt = `Rewrite an article based on the following outline and reference materials:

Title: ${outline.title}

Outline:
${outlineText}

Writing Style: ${outline.writingStyle}
Tone: ${outline.tone}${research}

Write the complete article in Markdown format. Use the reference materials as inspiration but create original content.`;
    } else {
      userPrompt = `Expand the following outline into a complete article:

Title: ${outline.title}

Outline:
${outlineText}

Writing Style: ${outline.writingStyle}
Tone: ${outline.tone}

Write the complete article in Markdown format, expanding each point into well-developed paragraphs.`;
    }

    return { systemPrompt, userPrompt };
  }
}

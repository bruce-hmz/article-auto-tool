/**
 * Claude Provider
 * 使用 Anthropic SDK 调用 Claude 模型
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { BaseLLMClient } from './base';
import type { LLMConfig, GenerateOptions, ChatMessage } from '../types/llm';

export class ClaudeClient extends BaseLLMClient {
  readonly provider = 'claude' as const;
  readonly model: string;
  
  private client: Anthropic;

  constructor(config: LLMConfig) {
    super(config.maxTokens ?? 4096, config.temperature ?? 0.7);
    
    if (!config.apiKey) {
      throw new Error('Claude API key is required');
    }

    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const opts = this.getOptions(options);
    logger.debug(`[Claude] Calling API with model ${this.model}...`);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        this.logGeneration(content.text.length);
        return content.text;
      }

      throw new Error('Unexpected response type from Claude');
    } catch (error) {
      logger.error('[Claude] API call failed', error);
      throw error;
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<string> {
    const opts = this.getOptions(options);
    
    // 提取 system 消息
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response type from Claude');
    } catch (error) {
      logger.error('[Claude] Chat API call failed', error);
      throw error;
    }
  }
}

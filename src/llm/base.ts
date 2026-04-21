/**
 * LLM Provider Base Class
 * 所有 LLM 提供商的基类
 */

import { logger } from '../utils/logger';
import type { ILLMClient, LLMProvider, GenerateOptions, ChatMessage } from '../types/llm';

export abstract class BaseLLMClient implements ILLMClient {
  abstract readonly provider: LLMProvider;
  abstract readonly model: string;
  
  protected maxTokens: number;
  protected temperature: number;

  constructor(maxTokens: number = 4096, temperature: number = 0.7) {
    this.maxTokens = maxTokens;
    this.temperature = temperature;
  }

  abstract generate(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions
  ): Promise<string>;

  abstract chat(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<string>;

  async generateWithRetry(
    systemPrompt: string,
    userPrompt: string,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generate(systemPrompt, userPrompt);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`[${this.provider}] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  protected getOptions(options?: GenerateOptions): { maxTokens: number; temperature: number; topP?: number } {
    return {
      maxTokens: options?.maxTokens ?? this.maxTokens,
      temperature: options?.temperature ?? this.temperature,
      topP: options?.topP,
    };
  }

  protected logGeneration(length: number): void {
    logger.debug(`[${this.provider}] Generated ${length} characters`);
  }
}

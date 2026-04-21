/**
 * OpenAI-Compatible Provider
 * 支持 OpenAI、DeepSeek、智谱 AI、月之暗面等兼容 OpenAI API 格式的服务
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { BaseLLMClient } from './base';
import type { LLMConfig, GenerateOptions, ChatMessage, LLMProvider } from '../types/llm';
import { PROVIDER_BASE_URLS } from '../types/llm';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAICompatibleClient extends BaseLLMClient {
  readonly provider: LLMProvider;
  readonly model: string;
  
  private client: AxiosInstance;
  private providerName: string;

  constructor(config: LLMConfig) {
    super(config.maxTokens ?? 4096, config.temperature ?? 0.7);
    
    this.model = config.model;
    this.provider = config.provider;
    this.providerName = this.getProviderDisplayName(config.provider);

    // 确定 base URL
    const baseUrl = config.baseUrl || PROVIDER_BASE_URLS[config.provider];
    
    if (!baseUrl && config.provider === 'custom') {
      throw new Error(`Base URL is required for custom provider`);
    }

    // 某些本地模型可能不需要 API key
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    this.client = axios.create({
      baseURL: baseUrl,
      headers,
      timeout: 120000, // 2 minutes timeout
    });

    logger.debug(`[${this.providerName}] Initialized with model ${this.model}, base URL: ${baseUrl}`);
  }

  private getProviderDisplayName(provider: LLMProvider): string {
    const names: Record<LLMProvider, string> = {
      openai: 'OpenAI',
      deepseek: 'DeepSeek',
      zhipu: '智谱AI',
      moonshot: 'Moonshot',
      ollama: 'Ollama',
      custom: 'Custom',
      claude: 'Claude',
    };
    return names[provider];
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions
  ): Promise<string> {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
    
    return this.chat(messages, options);
  }

  async chat(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<string> {
    const opts = this.getOptions(options);
    logger.debug(`[${this.providerName}] Calling API with model ${this.model}...`);

    try {
      const response = await this.client.post<OpenAIResponse>('/chat/completions', {
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        ...(opts.topP && { top_p: opts.topP }),
      });

      const content = response.data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Empty response from API');
      }

      this.logGeneration(content.length);
      return content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        logger.error(`[${this.providerName}] API call failed: ${errorMsg}`);
        throw new Error(`[${this.providerName}] ${errorMsg}`);
      }
      logger.error(`[${this.providerName}] API call failed`, error);
      throw error;
    }
  }
}

// 便捷工厂函数
export function createOpenAIClient(config: LLMConfig): OpenAICompatibleClient {
  return new OpenAICompatibleClient(config);
}

export function createDeepSeekClient(apiKey: string, model: string = 'deepseek-chat'): OpenAICompatibleClient {
  return new OpenAICompatibleClient({
    provider: 'deepseek',
    model,
    apiKey,
  });
}

export function createZhipuClient(apiKey: string, model: string = 'glm-4-plus'): OpenAICompatibleClient {
  return new OpenAICompatibleClient({
    provider: 'zhipu',
    model,
    apiKey,
  });
}

export function createMoonshotClient(apiKey: string, model: string = 'moonshot-v1-8k'): OpenAICompatibleClient {
  return new OpenAICompatibleClient({
    provider: 'moonshot',
    model,
    apiKey,
  });
}

export function createOllamaClient(model: string = 'llama3.1', baseUrl: string = 'http://localhost:11434/v1'): OpenAICompatibleClient {
  return new OpenAICompatibleClient({
    provider: 'ollama',
    model,
    baseUrl,
    // Ollama 不需要 API key
  });
}

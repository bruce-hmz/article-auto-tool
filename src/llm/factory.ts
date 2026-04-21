/**
 * LLM Client Factory
 * 根据环境变量配置创建对应的 LLM 客户端
 */

import { logger } from '../utils/logger';
import { ClaudeClient } from './claude-provider';
import { OpenAICompatibleClient } from './openai-provider';
import type { ILLMClient, LLMConfig, LLMProvider } from '../types/llm';
import { PRESET_MODELS } from '../types/llm';

// 环境变量配置映射
interface LLMEnvConfig {
  provider: LLMProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * 从环境变量读取 LLM 配置
 */
function getLLMConfigFromEnv(): LLMEnvConfig {
  const provider = (process.env.LLM_PROVIDER || 'claude').toLowerCase() as LLMProvider;
  
  const config: LLMEnvConfig = {
    provider,
    model: process.env.LLM_MODEL,
    apiKey: process.env.LLM_API_KEY,
    baseUrl: process.env.LLM_BASE_URL,
    maxTokens: process.env.LLM_MAX_TOKENS ? parseInt(process.env.LLM_MAX_TOKENS, 10) : undefined,
    temperature: process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : undefined,
  };

  // 如果没有指定 API Key，尝试从特定 provider 的环境变量获取
  if (!config.apiKey) {
    switch (provider) {
      case 'claude':
        config.apiKey = process.env.ANTHROPIC_API_KEY;
        break;
      case 'openai':
        config.apiKey = process.env.OPENAI_API_KEY;
        break;
      case 'deepseek':
        config.apiKey = process.env.DEEPSEEK_API_KEY;
        break;
      case 'zhipu':
        config.apiKey = process.env.ZHIPU_API_KEY;
        break;
      case 'moonshot':
        config.apiKey = process.env.MOONSHOT_API_KEY;
        break;
      // ollama 不需要 API key
      case 'ollama':
        config.apiKey = undefined;
        break;
    }
  }

  // 如果没有指定模型，使用默认模型
  if (!config.model && PRESET_MODELS[provider]) {
    config.model = PRESET_MODELS[provider].defaultModel;
  }

  return config;
}

/**
 * 创建 LLM 客户端
 */
export function createLLMClient(config?: Partial<LLMConfig>): ILLMClient {
  const envConfig = getLLMConfigFromEnv();
  
  const finalConfig: LLMConfig = {
    provider: config?.provider || envConfig.provider,
    model: config?.model || envConfig.model || PRESET_MODELS[envConfig.provider]?.defaultModel || '',
    apiKey: config?.apiKey ?? envConfig.apiKey,
    baseUrl: config?.baseUrl ?? envConfig.baseUrl,
    maxTokens: config?.maxTokens ?? envConfig.maxTokens ?? 4096,
    temperature: config?.temperature ?? envConfig.temperature ?? 0.7,
  };

  logger.info(`Creating LLM client: ${finalConfig.provider}/${finalConfig.model}`);

  switch (finalConfig.provider) {
    case 'claude':
      if (!finalConfig.apiKey) {
        throw new Error('Claude API key is required. Set ANTHROPIC_API_KEY or LLM_API_KEY environment variable.');
      }
      return new ClaudeClient(finalConfig);

    case 'openai':
    case 'deepseek':
    case 'zhipu':
    case 'moonshot':
    case 'ollama':
    case 'custom':
      // Ollama 不需要 API key
      if (finalConfig.provider !== 'ollama' && !finalConfig.apiKey) {
        const envVarMap: Record<string, string> = {
          openai: 'OPENAI_API_KEY',
          deepseek: 'DEEPSEEK_API_KEY',
          zhipu: 'ZHIPU_API_KEY',
          moonshot: 'MOONSHOT_API_KEY',
          custom: 'LLM_API_KEY',
        };
        throw new Error(
          `API key is required for ${finalConfig.provider}. Set ${envVarMap[finalConfig.provider]} or LLM_API_KEY environment variable.`
        );
      }
      return new OpenAICompatibleClient(finalConfig);

    default:
      throw new Error(`Unsupported LLM provider: ${finalConfig.provider}`);
  }
}

/**
 * 获取当前配置的 LLM 信息
 */
export function getLLMInfo(): { provider: LLMProvider; model: string } {
  const envConfig = getLLMConfigFromEnv();
  return {
    provider: envConfig.provider,
    model: envConfig.model || PRESET_MODELS[envConfig.provider]?.defaultModel || 'unknown',
  };
}

/**
 * 验证 LLM 配置是否有效
 */
export function validateLLMConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const envConfig = getLLMConfigFromEnv();

  // 检查 provider 是否支持
  const supportedProviders: LLMProvider[] = ['claude', 'openai', 'deepseek', 'zhipu', 'moonshot', 'ollama', 'custom'];
  if (!supportedProviders.includes(envConfig.provider)) {
    errors.push(`Unsupported LLM provider: ${envConfig.provider}. Supported: ${supportedProviders.join(', ')}`);
  }

  // 检查 API key (ollama 除外)
  if (envConfig.provider !== 'ollama' && !envConfig.apiKey) {
    errors.push(`API key is required for ${envConfig.provider}`);
  }

  // 检查模型是否指定
  if (!envConfig.model && !PRESET_MODELS[envConfig.provider]?.defaultModel) {
    errors.push(`Model is required for ${envConfig.provider}`);
  }

  // custom provider 需要 baseUrl
  if (envConfig.provider === 'custom' && !envConfig.baseUrl) {
    errors.push('Base URL is required for custom provider');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// 重新导出类型和组件
export { ClaudeClient } from './claude-provider';
export { OpenAICompatibleClient, createOpenAIClient, createDeepSeekClient, createZhipuClient, createMoonshotClient, createOllamaClient } from './openai-provider';
export type { ILLMClient, LLMConfig, LLMProvider, GenerateOptions, ChatMessage } from '../types/llm';

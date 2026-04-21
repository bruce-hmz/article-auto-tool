/**
 * LLM Module
 * 统一的 LLM 客户端接口，支持多种模型提供商
 */

// 主要导出
export { createLLMClient, getLLMInfo, validateLLMConfig } from './factory';

// 类型导出
export type { 
  ILLMClient, 
  LLMConfig, 
  LLMProvider, 
  GenerateOptions, 
  ChatMessage 
} from '../types/llm';
export { PRESET_MODELS, PROVIDER_BASE_URLS } from '../types/llm';

// 特定 provider 导出 (高级用法)
export { ClaudeClient } from './claude-provider';
export { 
  OpenAICompatibleClient,
  createOpenAIClient,
  createDeepSeekClient,
  createZhipuClient,
  createMoonshotClient,
  createOllamaClient,
} from './openai-provider';

/**
 * LLM Provider Types
 * 统一的 LLM 接口定义，支持多种模型提供商
 */

// 支持的 LLM 提供商
export type LLMProvider = 
  | 'claude'      // Anthropic Claude
  | 'openai'      // OpenAI GPT
  | 'deepseek'    // DeepSeek
  | 'zhipu'       // 智谱 AI (GLM)
  | 'moonshot'    // 月之暗面
  | 'ollama'      // 本地模型
  | 'custom';     // 自定义 OpenAI 兼容接口

// LLM 配置
export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;  // 自定义 API 地址
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

// 生成选项
export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

// 消息格式
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// LLM 客户端接口
export interface ILLMClient {
  readonly provider: LLMProvider;
  readonly model: string;
  
  /**
   * 生成文本
   */
  generate(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions
  ): Promise<string>;

  /**
   * 带重试的生成
   */
  generateWithRetry(
    systemPrompt: string,
    userPrompt: string,
    maxRetries?: number
  ): Promise<string>;

  /**
   * 多轮对话
   */
  chat(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<string>;
}

// 预设模型配置
export const PRESET_MODELS: Record<LLMProvider, { models: string[]; defaultModel: string }> = {
  claude: {
    models: [
      'claude-sonnet-4-6',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
    defaultModel: 'claude-sonnet-4-6',
  },
  openai: {
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ],
    defaultModel: 'gpt-4o',
  },
  deepseek: {
    models: [
      'deepseek-chat',
      'deepseek-coder',
      'deepseek-reasoner',
    ],
    defaultModel: 'deepseek-chat',
  },
  zhipu: {
    models: [
      'glm-4-plus',
      'glm-4-0520',
      'glm-4',
      'glm-4-air',
      'glm-4-airx',
      'glm-4-flash',
    ],
    defaultModel: 'glm-4-plus',
  },
  moonshot: {
    models: [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
    ],
    defaultModel: 'moonshot-v1-8k',
  },
  ollama: {
    models: [
      'llama3.1',
      'llama3.2',
      'qwen2.5',
      'deepseek-coder-v2',
      'mistral',
    ],
    defaultModel: 'llama3.1',
  },
  custom: {
    models: [],
    defaultModel: '',
  },
};

// 提供商的默认 Base URL
export const PROVIDER_BASE_URLS: Record<LLMProvider, string> = {
  claude: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  moonshot: 'https://api.moonshot.cn/v1',
  ollama: 'http://localhost:11434/v1',
  custom: '',
};

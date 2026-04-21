/**
 * Image Generator
 * 支持多种图片生成服务：
 * - 火山引擎方舟 (Volcano/Ark) - 需要 API Key
 * - SiliconFlow - 有免费额度
 * - OpenAI DALL-E - 需要 API Key
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { FileManager } from '../utils/file-manager';
import type { ImagePrompt, GeneratedImage } from '../types';

export type ImageProvider = 'volcano' | 'siliconflow' | 'openai' | 'none';

export class ImageGenerator {
  private provider: ImageProvider;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options?: {
    provider?: ImageProvider;
    apiKey?: string;
    model?: string;
  }) {
    // 从环境变量读取配置
    this.provider = options?.provider || (process.env.IMAGE_PROVIDER as ImageProvider) || 'volcano';
    
    // 根据提供商获取 API Key
    if (options?.apiKey) {
      this.apiKey = options.apiKey;
    } else if (this.provider === 'siliconflow') {
      this.apiKey = process.env.SILICONFLOW_API_KEY || '';
    } else if (this.provider === 'openai') {
      this.apiKey = process.env.OPENAI_API_KEY || '';
    } else {
      this.apiKey = process.env.VOLCANO_API_KEY || '';
    }
    
    this.model = options?.model || process.env.VOLCANO_MODEL || 'doubao-seedream-4-0-250828';

    // 自动检测可用的图片生成服务
    if (!options?.provider && !process.env.IMAGE_PROVIDER) {
      if (process.env.SILICONFLOW_API_KEY) {
        this.provider = 'siliconflow';
        this.apiKey = process.env.SILICONFLOW_API_KEY;
        this.baseUrl = 'https://api.siliconflow.cn/v1/images/generations';
        this.model = 'black-forest-labs/FLUX.1-schnell-Free'; // SiliconFlow 默认免费模型
      } else if (process.env.VOLCANO_API_KEY) {
        this.provider = 'volcano';
        this.apiKey = process.env.VOLCANO_API_KEY;
        this.baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
      }
    }
    
    // 根据提供商设置默认模型
    if (!options?.model && !process.env.VOLCANO_MODEL) {
      if (this.provider === 'siliconflow') {
        this.model = 'black-forest-labs/FLUX.1-schnell-Free';
      } else if (this.provider === 'openai') {
        this.model = 'dall-e-3';
      } else {
        this.model = 'doubao-seedream-4-0-250828';
      }
    }
    
    // 根据提供商设置 API 地址
    switch (this.provider) {
      case 'siliconflow':
        this.baseUrl = 'https://api.siliconflow.cn/v1/images/generations';
        break;
      case 'openai':
        this.baseUrl = 'https://api.openai.com/v1/images/generations';
        break;
      case 'volcano':
      default:
        this.baseUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
        break;
    }
  }

  /**
   * 获取当前图片生成配置信息
   */
  getConfig(): { provider: ImageProvider; model: string; hasApiKey: boolean } {
    return {
      provider: this.provider,
      model: this.model,
      hasApiKey: !!this.apiKey,
    };
  }

  async generateImage(
    prompt: ImagePrompt,
    outputPath: string
  ): Promise<GeneratedImage> {
    if (this.provider === 'none' || !this.apiKey) {
      logger.warn('Image generation is disabled or API key not configured');
      logger.warn('Set IMAGE_PROVIDER=volcano and VOLCANO_API_KEY to enable image generation');
      return {
        url: '',
        localPath: outputPath,
        prompt: prompt.description,
      };
    }

    logger.info(`Generating image with ${this.provider}/${this.model}`);

    try {
      const response = await this.callAPI(prompt);
      const imageUrl = response.data[0]?.url || response.data[0]?.b64_json;

      if (!imageUrl) {
        throw new Error('No image URL or data returned from API');
      }

      if (imageUrl.startsWith('http')) {
        // Download and save image
        const imageBuffer = await this.downloadImage(imageUrl);
        await FileManager.writeFile(outputPath, imageBuffer.toString('binary'));
      } else {
        // Base64 image
        const buffer = Buffer.from(imageUrl, 'base64');
        await FileManager.writeFile(outputPath, buffer.toString('binary'));
      }

      logger.success(`Image saved: ${outputPath}`);

      return {
        url: imageUrl.startsWith('http') ? imageUrl : `file://${outputPath}`,
        localPath: outputPath,
        prompt: prompt.description,
      };
    } catch (error) {
      logger.error('Failed to generate image', error);
      throw error;
    }
  }

  private async callAPI(prompt: ImagePrompt): Promise<{ data: Array<{ url?: string; b64_json?: string }> }> {
    const size = this.parseAspectRatio(prompt.aspectRatio || '16:9');
    const fullPrompt = `${prompt.description}. Style: ${prompt.style}`;

    switch (this.provider) {
      case 'siliconflow':
        return this.callSiliconFlow(fullPrompt, size);
      case 'openai':
        return this.callOpenAI(fullPrompt, size);
      case 'volcano':
      default:
        return this.callVolcano(fullPrompt, size);
    }
  }

  private async callVolcano(prompt: string, size: string): Promise<{ data: Array<{ url?: string; b64_json?: string }> }> {
    const response = await axios.post(
      this.baseUrl,
      {
        model: this.model,
        prompt,
        size,
        n: 1,
        response_format: 'url',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 60000,
      }
    );

    return response.data;
  }

  private async callSiliconFlow(prompt: string, size: string): Promise<{ data: Array<{ url?: string; b64_json?: string }> }> {
    const response = await axios.post(
      this.baseUrl,
      {
        model: this.model || 'black-forest-labs/FLUX.1-schnell-Free',
        prompt,
        image_size: size,
        num_inference_steps: 20,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 60000,
      }
    );

    return response.data;
  }

  private async callOpenAI(prompt: string, size: string): Promise<{ data: Array<{ url?: string; b64_json?: string }> }> {
    // OpenAI DALL-E 3 支持的尺寸
    const dalleSize = size === '1024x1024' || size === '1792x1024' || size === '1024x1792' 
      ? size 
      : '1024x1024';

    const response = await axios.post(
      this.baseUrl,
      {
        model: this.model || 'dall-e-3',
        prompt,
        size: dalleSize,
        n: 1,
        response_format: 'url',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 60000,
      }
    );

    return response.data;
  }

  async generateCoverImage(
    title: string,
    style: string,
    outputPath: string
  ): Promise<GeneratedImage> {
    const prompt: ImagePrompt = {
      description: `Create a visually striking cover image for an article titled "${title}". The image should be professional, eye-catching, and suitable for a WeChat official account.`,
      style: style,
      aspectRatio: '2.35:1',
    };

    return await this.generateImage(prompt, outputPath);
  }

  async generateIllustration(
    context: string,
    style: string,
    outputPath: string
  ): Promise<GeneratedImage> {
    const prompt: ImagePrompt = {
      description: `Create an illustration that visualizes: ${context}. The image should be informative, clear, and complement the article content.`,
      style: style,
      aspectRatio: '16:9',
    };

    return await this.generateImage(prompt, outputPath);
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    return Buffer.from(response.data, 'binary');
  }

  private parseAspectRatio(ratio: string): string {
    // 根据不同提供商返回支持的尺寸
    const ratioMap: Record<string, string> = {
      '16:9': '1024x576',
      '2.35:1': '1024x436',
      '4:3': '1024x768',
      '1:1': '1024x1024',
    };

    // SiliconFlow 支持的尺寸
    if (this.provider === 'siliconflow') {
      const siliconflowMap: Record<string, string> = {
        '16:9': '1920x1080',
        '2.35:1': '1920x817',
        '4:3': '1440x1080',
        '1:1': '1024x1024',
      };
      return siliconflowMap[ratio] || '1024x1024';
    }

    // OpenAI DALL-E 3 支持的尺寸
    if (this.provider === 'openai') {
      const openaiMap: Record<string, string> = {
        '16:9': '1792x1024',
        '2.35:1': '1792x1024', // 最接近的
        '4:3': '1024x1024',
        '1:1': '1024x1024',
      };
      return openaiMap[ratio] || '1024x1024';
    }

    // 火山引擎需要至少 921600 像素
    const volcanoMap: Record<string, string> = {
      '16:9': '1920x1080',  // 2,073,600 像素
      '2.35:1': '1920x817', // 1,568,640 像素
      '4:3': '1280x960',    // 1,228,800 像素
      '1:1': '1024x1024',   // 1,048,576 像素
    };
    return volcanoMap[ratio] || '1024x1024';
  }
}

export default ImageGenerator;

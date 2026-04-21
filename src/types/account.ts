import { z } from 'zod';

// Account configuration schema
export const AccountConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  appId: z.string(),
  appSecret: z.string(),
  config: z.object({
    defaultTheme: z.string().optional(),
    imageStyle: z.string().optional(),
    publishing: z.object({
      defaultAuthor: z.string().optional(),
      autoPublish: z.boolean().optional().default(false),
    }).optional(),
  }).optional(),
});

export type AccountConfig = z.infer<typeof AccountConfigSchema>;

// WeChat API credentials
export interface WeChatCredentials {
  appId: string;
  appSecret: string;
}

// WeChat access token response
export interface WeChatTokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

// WeChat image upload response
export interface WeChatImageUploadResponse {
  media_id: string;
  url: string;
  errcode?: number;
  errmsg?: string;
}

// WeChat draft response
export interface WeChatDraftResponse {
  media_id: string;
  errcode?: number;
  errmsg?: string;
}

// Article publishing info
export interface PublishingInfo {
  title: string;
  author: string;
  digest: string;
  content: string;
  coverImageMediaId?: string;
  contentSourceUrl?: string;
  needOpenComment?: number;
  onlyFansCanComment?: number;
}

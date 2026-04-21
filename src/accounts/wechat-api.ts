import axios from 'axios';
import { logger } from '../utils/logger';
import type {
  WeChatCredentials,
  WeChatTokenResponse,
  WeChatImageUploadResponse,
  WeChatDraftResponse,
  PublishingInfo,
} from '../types';
import { FileManager } from '../utils/file-manager';

export class WeChatAPI {
  private credentials: WeChatCredentials;
  private accessToken?: string;
  private tokenExpiresAt?: number;
  private baseUrl = 'https://api.weixin.qq.com/cgi-bin';

  constructor(credentials: WeChatCredentials) {
    this.credentials = credentials;
  }

  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    logger.info('Fetching new WeChat access token...');

    try {
      const response = await axios.get<WeChatTokenResponse>(
        `${this.baseUrl}/token`,
        {
          params: {
            grant_type: 'client_credential',
            appid: this.credentials.appId,
            secret: this.credentials.appSecret,
          },
        }
      );

      if (response.data.errcode) {
        throw new Error(
          `WeChat API error: ${response.data.errcode} - ${response.data.errmsg}`
        );
      }

      this.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiry
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;

      logger.success('Access token obtained');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get access token', error);
      throw error;
    }
  }

  async uploadImage(imagePath: string): Promise<{ mediaId: string; url: string }> {
    const accessToken = await this.getAccessToken();

    logger.info(`Uploading image: ${imagePath}`);

    try {
      const imageBuffer = await FileManager.readFile(imagePath);
      const formData = new FormData();
      formData.append('media', new Blob([imageBuffer]), 'image.png');
      formData.append('type', 'thumb');

      const response = await axios.post<WeChatImageUploadResponse>(
        `${this.baseUrl}/material/add_material?access_token=${accessToken}&type=thumb`,
        formData
      );

      if (response.data.errcode) {
        throw new Error(
          `WeChat API error: ${response.data.errcode} - ${response.data.errmsg}`
        );
      }

      logger.success(`Image uploaded: ${response.data.media_id}`);
      return {
        mediaId: response.data.media_id,
        url: response.data.url,
      };
    } catch (error) {
      logger.error('Failed to upload image', error);
      throw error;
    }
  }

  async uploadNewsImage(imagePath: string): Promise<string> {
    const accessToken = await this.getAccessToken();

    logger.info(`Uploading news image: ${imagePath}`);

    try {
      const imageBuffer = await FileManager.readFile(imagePath);
      const formData = new FormData();
      formData.append('media', new Blob([imageBuffer]), 'image.png');

      const response = await axios.post<{ url: string }>(
        `${this.baseUrl}/media/uploadimg?access_token=${accessToken}`,
        formData
      );

      if ('errcode' in response.data) {
        throw new Error(
          `WeChat API error: ${(response.data as any).errcode} - ${(response.data as any).errmsg}`
        );
      }

      logger.success(`News image uploaded: ${response.data.url}`);
      return response.data.url;
    } catch (error) {
      logger.error('Failed to upload news image', error);
      throw error;
    }
  }

  async saveDraft(publishingInfo: PublishingInfo): Promise<string> {
    const accessToken = await this.getAccessToken();

    logger.info('Saving article to WeChat drafts...');

    try {
      const articles = [
        {
          title: publishingInfo.title,
          author: publishingInfo.author,
          digest: publishingInfo.digest,
          content: publishingInfo.content,
          thumb_media_id: publishingInfo.coverImageMediaId || '',
          content_source_url: publishingInfo.contentSourceUrl || '',
          need_open_comment: publishingInfo.needOpenComment || 0,
          only_fans_can_comment: publishingInfo.onlyFansCanComment || 0,
        },
      ];

      const response = await axios.post<WeChatDraftResponse>(
        `${this.baseUrl}/draft/add?access_token=${accessToken}`,
        { articles }
      );

      if (response.data.errcode) {
        throw new Error(
          `WeChat API error: ${response.data.errcode} - ${response.data.errmsg}`
        );
      }

      logger.success(`Draft saved: ${response.data.media_id}`);
      return response.data.media_id;
    } catch (error) {
      logger.error('Failed to save draft', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      logger.success('WeChat API connection successful');
      return true;
    } catch (error) {
      logger.error('WeChat API connection failed', error);
      return false;
    }
  }
}

export default WeChatAPI;

import * as path from 'path';
import { FileManager } from './file-manager';
import { logger } from './logger';
import type { Article, FormattedArticle, GeneratedImage, Outline } from '../types/article';

/**
 * 暂存区数据结构
 */
export interface StagingData {
  workflowId: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;

  // 文章相关
  article: Article;
  formattedArticle?: FormattedArticle;
  outline?: Outline;

  // 图片相关
  coverImage?: GeneratedImage;
  illustrations?: GeneratedImage[];

  // 发布信息
  publishingInfo: {
    title: string;
    author: string;
    digest: string;
    content: string;
    coverImageMediaId?: string;
  };

  // 输出路径
  outputPath: string;

  // 发布状态
  publishStatus: 'pending' | 'success' | 'failed';
  publishError?: string;
  draftMediaId?: string;
  publishedAt?: string;

  // 重试次数
  retryCount: number;
}

/**
 * 发布暂存区管理器
 * 用于保存发布前的所有数据，支持发布失败后恢复
 */
export class PublishingStagingManager {
  private stagingDir: string;

  constructor(stagingDir: string = '.workflow-staging') {
    this.stagingDir = stagingDir;
  }

  /**
   * 初始化暂存区目录
   */
  async initialize(): Promise<void> {
    await FileManager.ensureDir(this.stagingDir);
  }

  /**
   * 保存数据到暂存区
   */
  async save(workflowId: string, data: Omit<StagingData, 'createdAt' | 'updatedAt' | 'publishStatus' | 'retryCount'>): Promise<void> {
    await this.initialize();

    const existingData = await this.load(workflowId);
    const now = new Date().toISOString();

    const stagingData: StagingData = {
      ...data,
      createdAt: existingData?.createdAt || now,
      updatedAt: now,
      publishStatus: 'pending',
      retryCount: existingData?.retryCount || 0,
    };

    const filePath = this.getStagingPath(workflowId);
    await FileManager.writeJSON(filePath, stagingData);
    logger.debug(`Saved staging data: ${workflowId}`);
  }

  /**
   * 从暂存区加载数据
   */
  async load(workflowId: string): Promise<StagingData | null> {
    const filePath = this.getStagingPath(workflowId);
    const exists = await FileManager.exists(filePath);

    if (!exists) {
      return null;
    }

    return await FileManager.readJSON<StagingData>(filePath);
  }

  /**
   * 更新发布状态为成功
   */
  async markSuccess(workflowId: string, draftMediaId: string): Promise<void> {
    const data = await this.load(workflowId);
    if (!data) {
      logger.warn(`Staging data not found: ${workflowId}`);
      return;
    }

    data.publishStatus = 'success';
    data.draftMediaId = draftMediaId;
    data.publishedAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();

    const filePath = this.getStagingPath(workflowId);
    await FileManager.writeJSON(filePath, data);
    logger.debug(`Marked staging as success: ${workflowId}`);
  }

  /**
   * 更新发布状态为失败
   */
  async markFailed(workflowId: string, error: string): Promise<void> {
    const data = await this.load(workflowId);
    if (!data) {
      logger.warn(`Staging data not found: ${workflowId}`);
      return;
    }

    data.publishStatus = 'failed';
    data.publishError = error;
    data.updatedAt = new Date().toISOString();
    data.retryCount += 1;

    const filePath = this.getStagingPath(workflowId);
    await FileManager.writeJSON(filePath, data);
    logger.debug(`Marked staging as failed: ${workflowId}`);
  }

  /**
   * 增加重试计数
   */
  async incrementRetry(workflowId: string): Promise<void> {
    const data = await this.load(workflowId);
    if (!data) return;

    data.retryCount += 1;
    data.updatedAt = new Date().toISOString();

    const filePath = this.getStagingPath(workflowId);
    await FileManager.writeJSON(filePath, data);
  }

  /**
   * 删除暂存数据
   */
  async delete(workflowId: string): Promise<void> {
    const filePath = this.getStagingPath(workflowId);
    const exists = await FileManager.exists(filePath);

    if (exists) {
      await FileManager.delete(filePath);
      logger.debug(`Deleted staging data: ${workflowId}`);
    }
  }

  /**
   * 列出所有暂存的工作流
   */
  async listStaging(): Promise<Array<{
    workflowId: string;
    accountId: string;
    title: string;
    status: string;
    retryCount: number;
    createdAt: string;
    updatedAt: string;
  }>> {
    await this.initialize();
    const files = await FileManager.listFiles(this.stagingDir, /\.json$/);
    const result = [];

    for (const file of files) {
      try {
        const data = await FileManager.readJSON<StagingData>(file);
        result.push({
          workflowId: data.workflowId,
          accountId: data.accountId,
          title: data.article?.title || 'Unknown',
          status: data.publishStatus,
          retryCount: data.retryCount,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } catch (error) {
        logger.warn(`Failed to read staging file: ${file}`);
      }
    }

    return result.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * 列出失败的暂存（可恢复）
   */
  async listFailed(): Promise<Array<{
    workflowId: string;
    accountId: string;
    title: string;
    error?: string;
    retryCount: number;
    updatedAt: string;
  }>> {
    const all = await this.listStaging();
    return all
      .filter(item => item.status === 'failed')
      .map(item => ({
        workflowId: item.workflowId,
        accountId: item.accountId,
        title: item.title,
        retryCount: item.retryCount,
        updatedAt: item.updatedAt,
      }));
  }

  /**
   * 清理旧的暂存数据
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    await this.initialize();
    const files = await FileManager.listFiles(this.stagingDir, /\.json$/);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let deleted = 0;
    for (const file of files) {
      try {
        const data = await FileManager.readJSON<StagingData>(file);
        // 只清理成功或超过重试次数的
        if (
          new Date(data.updatedAt) < cutoff &&
          (data.publishStatus === 'success' || data.retryCount >= 5)
        ) {
          await FileManager.delete(file);
          deleted++;
        }
      } catch (error) {
        logger.warn(`Failed to cleanup staging file: ${file}`);
      }
    }

    logger.info(`Cleaned up ${deleted} old staging data`);
    return deleted;
  }

  private getStagingPath(workflowId: string): string {
    return path.join(this.stagingDir, `${workflowId}.json`);
  }
}

export default PublishingStagingManager;

import * as path from 'path'
import { FileManager } from '../file-manager'
import type { StagingData, StagingListItem } from '../types'

// Get the project root directory (parent of web/)
const PROJECT_ROOT = path.resolve(process.cwd(), '..')

export class StagingService {
  private stagingDir: string

  constructor() {
    this.stagingDir = path.join(PROJECT_ROOT, '.workflow-staging')
  }

  async initialize(): Promise<void> {
    await FileManager.ensureDir(this.stagingDir)
  }

  async load(workflowId: string): Promise<StagingData | null> {
    const filePath = this.getStagingPath(workflowId)
    const exists = await FileManager.exists(filePath)

    if (!exists) {
      return null
    }

    return await FileManager.readJSON<StagingData>(filePath)
  }

  async updateStatus(
    workflowId: string,
    status: StagingData['publishStatus'],
    error?: string
  ): Promise<void> {
    const data = await this.load(workflowId)
    if (!data) {
      throw new Error(`Staging data ${workflowId} not found`)
    }

    data.publishStatus = status
    if (error) {
      data.publishError = error
    }
    if (status === 'failed') {
      data.retryCount += 1
    }
    data.updatedAt = new Date().toISOString()

    const filePath = this.getStagingPath(workflowId)
    await FileManager.writeJSON(filePath, data)
  }

  async delete(workflowId: string): Promise<void> {
    const filePath = this.getStagingPath(workflowId)
    await FileManager.delete(filePath)
  }

  async listStaging(): Promise<StagingListItem[]> {
    await this.initialize()
    const files = await FileManager.listFiles(this.stagingDir, /\.json$/)
    const result: StagingListItem[] = []

    for (const file of files) {
      try {
        const data = await FileManager.readJSON<StagingData>(file)
        result.push({
          workflowId: data.workflowId,
          accountId: data.accountId,
          title: data.article?.title || 'Unknown',
          status: data.publishStatus,
          retryCount: data.retryCount,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      } catch (error) {
        console.error(`Failed to read staging file: ${file}`)
      }
    }

    return result.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  async listFailed(): Promise<StagingListItem[]> {
    const all = await this.listStaging()
    return all.filter(item => item.status === 'failed')
  }

  async getStats(): Promise<{
    total: number
    pending: number
    success: number
    failed: number
  }> {
    const items = await this.listStaging()
    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      success: items.filter(i => i.status === 'success').length,
      failed: items.filter(i => i.status === 'failed').length,
    }
  }

  private getStagingPath(workflowId: string): string {
    return path.join(this.stagingDir, `${workflowId}.json`)
  }
}

export const stagingService = new StagingService()

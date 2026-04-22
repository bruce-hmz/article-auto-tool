/**
 * Step 10: Publish to WeChat (Web Implementation)
 *
 * Publishes article to WeChat draft box using account config from context.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
} from '../../types/step-execution'
import { WeChatAPI } from '../../../../src/accounts/wechat-api'
import { FileManager } from '../../file-manager'
import * as path from 'path'
import type { AccountConfig } from '../../../../src/types/account'

const stepPhases = new Map<string, number>()

export class Step10Publish implements StepHandler {
  id = 10
  name = 'Publish to WeChat'
  description = 'Save article to WeChat draft box'
  isKeyCheckpoint = true

  async execute(
    context: WebExecutionContext,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult> {
    const workflowId = context.workflowId
    let phase = stepPhases.get(workflowId) || 0

    // Get account config from context (set by Step 1)
    const accountConfig = context.metadata.accountConfig as AccountConfig | undefined
    if (!accountConfig) {
      return {
        success: false,
        error: 'No account configuration found. Please complete Step 1 first.',
      }
    }

    emitEvent({
      type: 'log',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: `Using account: ${accountConfig.name}`,
      },
    })

    // Get article data from context
    const formattedArticle = context.metadata.formattedArticle as {
      title?: string
      content?: string
      html?: string
      author?: string
      digest?: string
    } | undefined
    if (!formattedArticle) {
      return {
        success: false,
        error: 'No formatted article found. Please complete formatting step first.',
      }
    }

    // Phase 0: Ask for confirmation
    if (phase === 0) {
      stepPhases.set(workflowId, 1)
      return {
        success: true,
        requiresInteraction: true,
        interaction: {
          type: 'confirm',
          message: 'Ready to publish! This will save the article to your WeChat draft box. Continue?',
          stepId: this.id,
          stepName: this.name,
        },
      }
    }

    // Phase 1: Handle confirmation and publish
    if (phase === 1) {
      const confirmed = context.userInput?.value

      if (confirmed === false || confirmed === 'false') {
        stepPhases.delete(workflowId)
        return {
          success: true,
          data: {
            published: false,
            message: 'Publishing cancelled by user',
          },
        }
      }

      emitEvent({
        type: 'progress',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'Publishing to WeChat...',
        },
      })

      try {
        // Initialize WeChat API with account config from context
        const wechatApi = new WeChatAPI(accountConfig)

        // Get cover image if available
        const coverImage = context.metadata.coverImage as { path?: string } | undefined
        let mediaId: string | undefined

        if (coverImage?.path) {
          emitEvent({
            type: 'log',
            data: {
              stepId: this.id,
              stepName: this.name,
              message: 'Uploading cover image...',
            },
          })

          try {
            const uploadResult = await wechatApi.uploadImage(coverImage.path)
            mediaId = uploadResult.mediaId
            emitEvent({
              type: 'log',
              data: {
                stepId: this.id,
                stepName: this.name,
                message: `Cover image uploaded: ${mediaId}`,
              },
            })
          } catch (imgError) {
            emitEvent({
              type: 'log',
              data: {
                stepId: this.id,
                stepName: this.name,
                message: `Cover image upload failed: ${imgError}. Continuing without image.`,
              },
            })
          }
        }

        const title = formattedArticle.title || 'Untitled Article'
        const content = formattedArticle.html || formattedArticle.content || ''

        emitEvent({
          type: 'log',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Creating draft: ${title}`,
          },
        })

        const result = await wechatApi.saveDraft({
          title,
          content,
          coverImageMediaId: mediaId,
          author: formattedArticle.author || '',
          digest: formattedArticle.digest || '',
        })

        if (result) {
          emitEvent({
            type: 'completed',
            data: {
              stepId: this.id,
              stepName: this.name,
              message: `Article saved to WeChat draft box (media_id: ${result})`,
              result: {
                mediaId: result,
                draftUrl: `https://mp.weixin.qq.com`,
              },
            },
          })

          const outputPath = path.join(context.outputPath, '10-publish.json')
          await FileManager.writeJSON(outputPath, {
            success: true,
            mediaId: result,
            title,
            publishedAt: new Date().toISOString(),
          })

          stepPhases.delete(workflowId)

          return {
            success: true,
            data: {
              published: true,
              mediaId: result,
              draftUrl: 'https://mp.weixin.qq.com',
              outputPath,
            },
          }
        } else {
          throw new Error('No media_id returned from WeChat API')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        emitEvent({
          type: 'error',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Publishing failed: ${errorMessage}`,
            error: errorMessage,
          },
        })

        return {
          success: false,
          error: errorMessage,
        }
      }
    }

    stepPhases.delete(workflowId)
    return {
      success: false,
      error: 'Unknown phase in publishing',
    }
  }
}

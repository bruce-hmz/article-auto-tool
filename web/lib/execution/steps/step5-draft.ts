/**
 * Step 5: Write Draft (Web Implementation)
 *
 * Writes article draft based on outline.
 * Requires user confirmation at key checkpoint mode.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
  InteractionRequest,
} from '../../types/step-execution'
import { createLLMClient, validateLLMConfig, getLLMInfo } from '../../../../src/llm'
import { PromptManager } from '../../../../src/utils/prompt-manager'
import { FileManager } from '../../file-manager'
import * as path from 'path'
import type { AccountConfig } from '../../../../src/types/account'

interface Outline {
  title: string
  sections: Array<{ heading: string; points: string[] }>
  writingStyle: string
  tone: string
}

interface ResearchMaterial {
  url?: string
  title?: string
  content: string
  relevance?: string
}

// Phase tracking for multi-stage interaction
const stepPhases = new Map<string, number>()
const generatedDrafts = new Map<string, string>()

export class Step5Draft implements StepHandler {
  id = 5
  name = 'Write Draft'
  description = 'Write article draft based on outline'
  isKeyCheckpoint = true

  async execute(
    context: WebExecutionContext,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult> {
    const workflowId = context.workflowId
    let phase = stepPhases.get(workflowId) || 0

    // Validate LLM configuration
    const validation = validateLLMConfig()
    if (!validation.valid) {
      return {
        success: false,
        error: `LLM configuration error: ${validation.errors.join(', ')}`,
      }
    }

    const llmClient = createLLMClient()

    // Get outline from context
    const outline = context.metadata.outline as Outline | undefined
    if (!outline) {
      return {
        success: false,
        error: 'No outline found. Please complete Step 4 first.',
      }
    }

    // Get research materials if available
    const researchMaterials = context.metadata.researchMaterials as ResearchMaterial[] | undefined

    // Phase 0: Generate draft
    if (phase === 0) {
      emitEvent({
        type: 'progress',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'Writing article draft...',
        },
      })

      // Load PromptManager for account-specific prompts
      const accountConfig = context.metadata.accountConfig as AccountConfig | undefined
      const promptManager = context.accountId
        ? await PromptManager.fromAccount(context.accountId, accountConfig)
        : new PromptManager()

      const researchContext = researchMaterials && researchMaterials.length > 0
        ? researchMaterials
            .slice(0, 3)
            .map((m) => `Title: ${m.title || 'Untitled'}\n${m.content.substring(0, 800)}...`)
            .join('\n\n')
        : undefined

      const { systemPrompt, userPrompt } = promptManager.getDraftPrompts(
        'original',
        outline,
        researchContext
      )

      try {
        const draft = await llmClient.generate(systemPrompt, userPrompt)
        generatedDrafts.set(workflowId, draft)

        // Save draft
        const outputPath = path.join(context.outputPath, '05-draft.md')
        await FileManager.writeFile(outputPath, draft)
        const llmInfo = getLLMInfo()
        context.metadata.article = {
          content: draft,
          title: outline.title,
          author: promptManager.getAuthor(llmInfo.provider),
        }

        emitEvent({
          type: 'log',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Draft generated (${draft.split(/\s+/).length} words)`,
          },
        })

        // Ask for confirmation
        stepPhases.set(workflowId, 1)
        return {
          success: true,
          requiresInteraction: true,
          interaction: {
            type: 'select',
            message: `Draft generated! (${draft.split(/\s+/).length} words)\n\nWhat would you like to do?`,
            stepId: this.id,
            stepName: this.name,
            options: {
              choices: [
                { value: 'accept', label: 'Accept and continue' },
                { value: 'regenerate', label: 'Regenerate draft' },
                { value: 'edit', label: 'Edit draft manually' },
              ],
            },
          },
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to generate draft: ${error}`,
        }
      }
    }

    // Phase 1: Handle user choice
    if (phase === 1) {
      const choice = context.userInput?.value as string

      if (choice === 'accept') {
        const draft = generatedDrafts.get(workflowId)
        stepPhases.delete(workflowId)
        generatedDrafts.delete(workflowId)

        emitEvent({
          type: 'completed',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: 'Draft accepted',
            result: {
              wordCount: draft?.split(/\s+/).length || 0,
            },
          },
        })

        return {
          success: true,
          data: {
            draft,
            outputPath: path.join(context.outputPath, '05-draft.md'),
          },
        }
      }

      if (choice === 'regenerate') {
        // Restart generation
        stepPhases.set(workflowId, 0)
        return this.execute(context, emitEvent)
      }

      if (choice === 'edit') {
        stepPhases.set(workflowId, 2)
        const draft = generatedDrafts.get(workflowId) || ''
        return {
          success: true,
          requiresInteraction: true,
          interaction: {
            type: 'input',
            message: 'Edit the draft (paste modified content):',
            stepId: this.id,
            stepName: this.name,
            options: {
              placeholder: draft.substring(0, 500) + '...',
            },
          },
        }
      }
    }

    // Phase 2: Handle edited draft
    if (phase === 2) {
      const editedDraft = context.userInput?.value as string
      if (editedDraft) {
        // Save edited draft
        const outputPath = path.join(context.outputPath, '05-draft.md')
        await FileManager.writeFile(outputPath, editedDraft)
        context.metadata.article = {
          content: editedDraft,
          title: outline.title,
        }

        stepPhases.delete(workflowId)
        generatedDrafts.delete(workflowId)

        emitEvent({
          type: 'completed',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: 'Draft edited and saved',
            result: {
              wordCount: editedDraft.split(/\s+/).length,
            },
          },
        })

        return {
          success: true,
          data: {
            draft: editedDraft,
            outputPath,
          },
        }
      }
    }

    // Default: restart
    stepPhases.delete(workflowId)
    return {
      success: false,
      error: 'Unknown phase in draft generation',
    }
  }
}

export default Step5Draft

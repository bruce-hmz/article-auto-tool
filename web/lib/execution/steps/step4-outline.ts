/**
 * Step 4: Outline (Web Implementation)
 *
 * Creates article outline with title and structure.
 * Requires user confirmation/modification.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
  InteractionRequest,
} from '../../types/step-execution'
import { createLLMClient, validateLLMConfig } from '../../../../src/llm'
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

interface TopicIdea {
  title: string
  description: string
}

// Phase tracking for multi-stage interaction
const stepPhases = new Map<string, number>()
const generatedOutlines = new Map<string, Outline>()

export class Step4Outline implements StepHandler {
  id = 4
  name = 'Generate Outline'
  description = 'Create article outline with title and structure'
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

    // Get topic from context
    const selectedTopic = context.metadata.selectedTopic as TopicIdea | undefined
    if (!selectedTopic) {
      return {
        success: false,
        error: 'No topic selected. Please complete Step 2 first.',
      }
    }

    // Phase 0: Generate outline
    if (phase === 0) {
      emitEvent({
        type: 'progress',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'Generating outline...',
        },
      })

      // Load PromptManager for account-specific prompts
      const accountConfig = context.metadata.accountConfig as AccountConfig | undefined
      const briefData = context.metadata.editorialBrief as Record<string, unknown> | undefined
      const promptManager = context.accountId && accountConfig
        ? PromptManager.fromBrief(accountConfig, briefData)
        : new PromptManager()

      const { systemPrompt, userPrompt } = promptManager.getOutlinePrompts({
        title: selectedTopic.title,
        description: selectedTopic.description || '',
        keywords: [],
      })

      try {
        const response = await llmClient.generate(systemPrompt, userPrompt)

        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          return {
            success: false,
            error: 'Failed to parse outline from AI response',
          }
        }

        const parsed = JSON.parse(jsonMatch[0])
        const outline: Outline = {
          title: parsed.title || selectedTopic.title,
          sections: parsed.sections || [],
          writingStyle: parsed.writingStyle || 'casual',
          tone: parsed.tone || 'informative',
        }

        // Store for later phases
        generatedOutlines.set(workflowId, outline)

        // Save to file
        const outputPath = path.join(context.outputPath, '04-outline.json')
        await FileManager.writeJSON(outputPath, outline)

        context.metadata.outline = outline

        // Ask for confirmation
        stepPhases.set(workflowId, 1)
        return {
          success: true,
          requiresInteraction: true,
          interaction: {
            type: 'select',
            message: `Outline generated:\n\nTitle: ${outline.title}\nSections: ${outline.sections.length}\nStyle: ${outline.writingStyle}\nTone: ${outline.tone}\n\nIs this outline acceptable?`,
            stepId: this.id,
            stepName: this.name,
            options: {
              choices: [
                { value: 'accept', label: 'Yes, proceed with this outline' },
                { value: 'modify', label: 'I want to modify the outline' },
              ],
            },
          },
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to generate outline: ${error}`,
        }
      }
    }

    // Phase 1: Handle confirmation/modification
    if (phase === 1) {
      const choice = context.userInput?.value as string
      const outline = generatedOutlines.get(workflowId)

      if (!outline) {
        return {
          success: false,
          error: 'Outline not found. Please restart this step.',
        }
      }

      if (choice === 'accept') {
        // Done with this step
        stepPhases.delete(workflowId)
        generatedOutlines.delete(workflowId)

        emitEvent({
          type: 'completed',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: 'Outline accepted',
            result: {
              outline,
            },
          },
        })

        return {
          success: true,
          data: {
            outline,
            outputPath: path.join(context.outputPath, '04-outline.json'),
          },
        }
      }

      if (choice === 'modify') {
        stepPhases.set(workflowId, 2)
        return {
          success: true,
          requiresInteraction: true,
          interaction: {
            type: 'input',
            message: 'Enter your modifications or new outline structure:',
            stepId: this.id,
            stepName: this.name,
            options: {
              placeholder: 'e.g., Change title to: New Title\nAdd section about X\nRemove section Y',
            },
          },
        }
      }
    }

    // Phase 2: Handle modifications
    if (phase === 2) {
      const modification = context.userInput?.value as string
      const outline = generatedOutlines.get(workflowId)

      if (!outline) {
        return {
          success: false,
          error: 'Outline not found. Please restart this step.',
        }
      }

      // Apply modifications (simple text-based approach)
      emitEvent({
        type: 'progress',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'Applying modifications...',
        },
      })

      // Re-generate outline with modifications
      const prompt = `Modify the following outline based on user feedback:

Original Outline:
${JSON.stringify(outline, null, 2)}

User Modifications:
${modification}

Return the modified outline as a JSON object with the same structure.
Only return valid JSON, no other text.`

      try {
        const response = await llmClient.generate('You are a professional article outline creator.', prompt)
        const jsonMatch = response.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          const modifiedOutline: Outline = {
            title: parsed.title || outline.title,
            sections: parsed.sections || outline.sections,
            writingStyle: parsed.writingStyle || outline.writingStyle,
            tone: parsed.tone || outline.tone,
          }

          generatedOutlines.set(workflowId, modifiedOutline)

          // Save updated outline
          const outputPath = path.join(context.outputPath, '04-outline.json')
          await FileManager.writeJSON(outputPath, modifiedOutline)
          context.metadata.outline = modifiedOutline

          // Ask for final confirmation
          stepPhases.set(workflowId, 1)
          return {
            success: true,
            requiresInteraction: true,
            interaction: {
              type: 'select',
              message: `Modified Outline:\n\nTitle: ${modifiedOutline.title}\nSections: ${modifiedOutline.sections.length}\nStyle: ${modifiedOutline.writingStyle}\nTone: ${modifiedOutline.tone}\n\nIs this acceptable?`,
              stepId: this.id,
              stepName: this.name,
              options: {
                choices: [
                  { value: 'accept', label: 'Yes, proceed' },
                  { value: 'modify', label: 'Modify again' },
                ],
              },
            },
          }
        }
      } catch (error) {
        emitEvent({
          type: 'log',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Modification failed: ${error}`,
          },
        })
      }

      // If modification failed, ask again
      stepPhases.set(workflowId, 1)
      return {
        success: true,
        requiresInteraction: true,
        interaction: {
          type: 'select',
          message: 'Failed to apply modifications. Would you like to try again?',
          stepId: this.id,
          stepName: this.name,
          options: {
            choices: [
              { value: 'accept', label: 'Use original outline' },
              { value: 'modify', label: 'Try different modifications' },
            ],
          },
        },
      }
    }

    // Default: restart
    stepPhases.delete(workflowId)
    return {
      success: false,
      error: 'Unknown phase in outline generation',
    }
  }
}

export default Step4Outline

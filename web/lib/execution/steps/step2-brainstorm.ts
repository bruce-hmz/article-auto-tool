/**
 * Step 2: Topic Brainstorming (Web Implementation)
 *
 * Generates topic ideas using LLM and lets user select or enter custom topic.
 * Requires multiple user interactions.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
  InteractionRequest,
  UserInput,
} from '../../types/step-execution'
import { createLLMClient, validateLLMConfig } from '../../../../src/llm'
import { PromptManager } from '../../../../src/utils/prompt-manager'
import { sanitizePromptInput } from '../../../../src/utils/sanitizer'
import { FileManager } from '../../file-manager'
import * as path from 'path'
import type { AccountConfig } from '../../../../src/types/account'

interface TopicIdea {
  title: string
  description: string
  keywords: string[]
  reasoning: string
}

// Phase tracking for this step
const stepPhase = new Map<string, 'theme' | 'select' | 'custom_title' | 'custom_desc'>()

export class Step2Brainstorm implements StepHandler {
  id = 2
  name = 'Topic Brainstorming'
  description = 'Generate topic ideas using AI'
  isKeyCheckpoint = false

  async execute(
    context: WebExecutionContext,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult> {
    emitEvent({
      type: 'progress',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: 'Starting topic brainstorming...',
      },
    })

    // Validate LLM configuration
    const validation = validateLLMConfig()
    if (!validation.valid) {
      return {
        success: false,
        error: `LLM configuration error: ${validation.errors.join(', ')}`,
      }
    }

    // Check if we have user input (resuming after interaction)
    const userInput = context.userInput

    // Phase 1: Ask for theme
    if (!userInput || !stepPhase.has(context.workflowId)) {
      stepPhase.set(context.workflowId, 'theme')
      return {
        success: true,
        requiresInteraction: true,
        interaction: {
          type: 'input',
          message: 'Enter a theme, keyword, or topic direction (or leave empty for random ideas):',
          stepId: this.id,
          stepName: this.name,
          options: {
            placeholder: 'e.g., AI technology, healthy living, travel tips...',
          },
        },
      }
    }

    const phase = stepPhase.get(context.workflowId)

    // Phase 2: Generate topics based on theme
    if (phase === 'theme') {
      const theme = userInput.value as string

      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: 'Generating topic ideas...',
        },
      })

      const topics = await this.generateTopics(context, theme)

      // Store generated topics in context
      context.metadata.generatedTopics = topics

      // Phase 3: Let user select topic
      stepPhase.set(context.workflowId, 'select')

      const choices = [
        ...topics.map((topic, index) => ({
          value: String(index),
          label: topic.title,
          description: topic.description.substring(0, 50) + '...',
        })),
        {
          value: 'custom',
          label: 'Enter a custom topic',
          description: 'Define your own topic',
        },
      ]

      return {
        success: true,
        requiresInteraction: true,
        interaction: {
          type: 'select',
          message: 'Select a topic or enter your own:',
          stepId: this.id,
          stepName: this.name,
          options: {
            choices,
          },
        },
      }
    }

    // Phase 4: Handle selection
    if (phase === 'select') {
      const selection = userInput.value as string
      let selectedTopic: TopicIdea

      if (selection === 'custom') {
        // Need to get custom title and description
        stepPhase.set(context.workflowId, 'custom_title')
        return {
          success: true,
          requiresInteraction: true,
          interaction: {
            type: 'input',
            message: 'Enter your topic title:',
            stepId: this.id,
            stepName: this.name,
            options: {},
          },
        }
      }

      // Use selected topic
      const topics = context.metadata.generatedTopics as TopicIdea[]
      selectedTopic = topics[parseInt(selection)]

      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `Selected topic: ${selectedTopic.title}`,
        },
      })

      return this.completeStep(context, selectedTopic, emitEvent)
    }

    // Phase 5: Get custom title
    if (phase === 'custom_title') {
      context.metadata.customTitle = userInput.value as string
      stepPhase.set(context.workflowId, 'custom_desc')

      return {
        success: true,
        requiresInteraction: true,
        interaction: {
          type: 'input',
          message: 'Enter a brief description:',
          stepId: this.id,
          stepName: this.name,
          options: {},
        },
      }
    }

    // Phase 6: Get custom description and complete
    if (phase === 'custom_desc') {
      const customTitle = context.metadata.customTitle as string
      const customDesc = userInput.value as string

      const selectedTopic: TopicIdea = {
        title: customTitle,
        description: customDesc,
        keywords: [],
        reasoning: 'User-defined topic',
      }

      emitEvent({
        type: 'log',
        data: {
          stepId: this.id,
          stepName: this.name,
          message: `Custom topic: ${selectedTopic.title}`,
        },
      })

      return this.completeStep(context, selectedTopic, emitEvent)
    }

    return {
      success: false,
      error: 'Unknown phase in brainstorm step',
    }
  }

  private async generateTopics(context: WebExecutionContext, theme: string): Promise<TopicIdea[]> {
    const llmClient = createLLMClient()

    // Load PromptManager for account-specific prompts
    const accountConfig = context.metadata.accountConfig as AccountConfig | undefined
    const briefData = context.metadata.editorialBrief as Record<string, unknown> | undefined
    const promptManager = context.accountId && accountConfig
      ? PromptManager.fromBrief(accountConfig, briefData)
      : new PromptManager()

    // Sanitize theme input
    const { sanitized, wasModified, reason } = sanitizePromptInput(theme)
    const cleanTheme = wasModified ? sanitized : theme

    const { systemPrompt, userPrompt } = promptManager.getBrainstormPrompts(cleanTheme || undefined)

    const response = await llmClient.generateWithRetry(systemPrompt, userPrompt)

    // Parse topics
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('No JSON array found in response')
    } catch (error) {
      throw new Error('Failed to parse topic ideas from AI response')
    }
  }

  private async completeStep(
    context: WebExecutionContext,
    selectedTopic: TopicIdea,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult> {
    // Clean up phase tracking
    stepPhase.delete(context.workflowId)

    // Save to file
    const outputPath = path.join(context.outputPath, '02-topics.json')
    await FileManager.writeJSON(outputPath, {
      generatedTopics: context.metadata.generatedTopics || [],
      selectedTopic,
    })

    // Store in context
    context.metadata.selectedTopic = selectedTopic

    emitEvent({
      type: 'completed',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: `Topic selected: ${selectedTopic.title}`,
        result: {
          selectedTopic,
          outputPath,
        },
      },
    })

    return {
      success: true,
      data: {
        selectedTopic,
        outputPath,
      },
    }
  }
}

export default Step2Brainstorm

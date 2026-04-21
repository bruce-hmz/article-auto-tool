/**
 * Step 3: Research & Material Collection (Web Implementation)
 *
 * Gathers reference materials and information.
 * Requires multiple user interactions.
 */

import type {
  StepHandler,
  WebExecutionContext,
  StepExecutionResult,
  ExecutionEvent,
  InteractionRequest,
} from '../../types/step-execution'
import { WebSearch, URLFetcher } from '../../../../src/research'
import { FileManager } from '../../file-manager'
import * as path from 'path'

interface ResearchMaterial {
  url?: string
  title?: string
  content: string
  relevance?: string
}

// Phase tracking for multi-stage interaction
const stepPhases = new Map<string, number>()

export class Step3Research implements StepHandler {
  id = 3
  name = 'Research & Material Collection'
  description = 'Gather reference materials and information'
  isKeyCheckpoint = true

  async execute(
    context: WebExecutionContext,
    emitEvent: (event: Omit<ExecutionEvent, 'timestamp'>) => void
  ): Promise<StepExecutionResult> {
    const materials: ResearchMaterial[] = []
    const workflowId = context.workflowId

    // Get current phase
    let phase = stepPhases.get(workflowId) || 0

    // Phase 0: Ask if user wants to search
    if (phase === 0) {
      stepPhases.set(workflowId, 1)
      return {
        success: true,
        requiresInteraction: true,
        interaction: {
          type: 'select',
          message: 'Would you like to search for reference materials?',
          stepId: this.id,
          stepName: this.name,
          options: {
            choices: [
              { value: 'search', label: 'Yes, search the web' },
              { value: 'urls', label: 'Add reference URLs manually' },
              { value: 'notes', label: 'Add research notes only' },
              { value: 'skip', label: 'No, skip research' },
            ],
          },
        },
      }
    }

    // Get user input from context
    const userInput = context.userInput

    // Phase 1: Handle search/URL/notes/skip
    if (phase === 1) {
      const choice = userInput?.value as string

      if (choice === 'skip') {
        stepPhases.delete(workflowId)
        return {
          success: true,
          data: {
            materialsCount: 0,
            skipped: true,
          },
        }
      }

      if (choice === 'search') {
        // Search the web
        const topic = context.metadata.selectedTopic
        const searchTerm = typeof topic === 'object' && topic?.title
          ? topic.title
          : String(topic || 'topic')

        emitEvent({
          type: 'progress',
          data: {
            stepId: this.id,
            stepName: this.name,
            message: `Searching for: ${searchTerm}`,
          },
        })

        try {
          const webSearch = new WebSearch()
          const searchResults = await webSearch.search(searchTerm)

          if (searchResults.length > 0) {
            emitEvent({
              type: 'log',
              data: {
                stepId: this.id,
                stepName: this.name,
                message: `Found ${searchResults.length} results`,
              },
            })

            // Fetch top 3 results
            const urlFetcher = new URLFetcher()
            const urls = searchResults.slice(0, 3).map((r) => r.url)
            const contents = await urlFetcher.fetchMultiple(urls)

            contents.forEach((content) => {
              if (!content.error && content.content) {
                materials.push({
                  url: content.url,
                  title: content.title,
                  content: content.content,
                  relevance: searchResults.find((r) => r.url === content.url)?.snippet,
                })
              }
            })
          }
        } catch (error) {
          emitEvent({
            type: 'log',
            data: {
              stepId: this.id,
              stepName: this.name,
              message: `Search failed: ${error}`,
            },
          })
        }
      }

      if (choice === 'urls') {
        stepPhases.set(workflowId, 2)
        return {
          success: true,
          requiresInteraction: true,
          interaction: {
            type: 'input',
            message: 'Enter reference URLs (one per line):',
            stepId: this.id,
            stepName: this.name,
            options: {
              placeholder: 'https://example.com/article1\nhttps://example.com/article2',
            },
          },
        }
      }

      if (choice === 'notes') {
        stepPhases.set(workflowId, 3)
        return {
          success: true,
          requiresInteraction: true,
          interaction: {
            type: 'input',
            message: 'Enter your research notes:',
            stepId: this.id,
            stepName: this.name,
            options: {
              placeholder: 'Add your notes here...',
            },
          },
        }
      }
    }

    // Phase 2: Handle URL input
    if (phase === 2) {
      const urlInput = userInput?.value as string
      if (urlInput) {
        const urls = urlInput.split('\n').map((u) => u.trim()).filter((u) => u)

        if (urls.length > 0) {
          emitEvent({
            type: 'progress',
            data: {
              stepId: this.id,
              stepName: this.name,
              message: `Fetching ${urls.length} URLs...`,
            },
          })

          try {
            const urlFetcher = new URLFetcher()
            const contents = await urlFetcher.fetchMultiple(urls)

            contents.forEach((content) => {
              if (!content.error && content.content) {
                materials.push({
                  url: content.url,
                  title: content.title,
                  content: content.content,
                })
              }
            })
          } catch (error) {
            emitEvent({
              type: 'log',
              data: {
                stepId: this.id,
                stepName: this.name,
                message: `URL fetch failed: ${error}`,
              },
            })
          }
        }
      }

      // Ask for additional notes
      stepPhases.set(workflowId, 3)
      return {
        success: true,
        requiresInteraction: true,
        interaction: {
          type: 'confirm',
          message: 'Would you like to add research notes?',
          stepId: this.id,
          stepName: this.name,
        },
      }
    }

    // Phase 3: Handle notes
    if (phase === 3) {
      const notesInput = userInput?.value

      if (notesInput && typeof notesInput === 'string') {
        materials.push({
          content: notesInput,
          relevance: 'User notes',
        })
      } else if (userInput?.value === true) {
        // User wants to add notes, but we need input
        return {
          success: true,
          requiresInteraction: true,
          interaction: {
            type: 'input',
            message: 'Enter your research notes:',
            stepId: this.id,
            stepName: this.name,
            options: {
              placeholder: 'Add your notes here...',
            },
          },
        }
      }
    }

    // Save results
    const outputPath = path.join(context.outputPath, '03-research.json')
    await FileManager.writeJSON(outputPath, {
      materials,
      timestamp: new Date().toISOString(),
    })

    context.metadata.researchMaterials = materials

    stepPhases.delete(workflowId)

    emitEvent({
      type: 'completed',
      data: {
        stepId: this.id,
        stepName: this.name,
        message: `Collected ${materials.length} research material(s)`,
        result: {
          materialsCount: materials.length,
          outputPath,
        },
      },
    })

    return {
      success: true,
      data: {
        materialsCount: materials.length,
        outputPath,
      },
    }
  }
}

export default Step3Research

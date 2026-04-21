import type { Step } from "./types"

export const STEPS: Step[] = [
  { id: 0, name: 'Config Check', description: 'Check configuration', isKeyCheckpoint: false },
  { id: 1, name: 'Account Select', description: 'Select WeChat account', isKeyCheckpoint: true },
  { id: 2, name: 'Brainstorm', description: 'Generate topic ideas', isKeyCheckpoint: false },
  { id: 3, name: 'Research', description: 'Research topic', isKeyCheckpoint: false },
  { id: 4, name: 'Outline', description: 'Create article outline', isKeyCheckpoint: true },
  { id: 5, name: 'Draft', description: 'Write article draft', isKeyCheckpoint: true },
  { id: 6, name: 'Format', description: 'Format to HTML', isKeyCheckpoint: false },
  { id: 7, name: 'Cover Image', description: 'Generate cover image', isKeyCheckpoint: false },
  { id: 8, name: 'Illustrations', description: 'Generate illustrations', isKeyCheckpoint: false },
  { id: 9, name: 'Preview', description: 'Preview article', isKeyCheckpoint: true },
  { id: 10, name: 'Publish', description: 'Publish to WeChat', isKeyCheckpoint: true },
]

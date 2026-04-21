/**
 * Execution Manager
 *
 * Singleton pattern for managing workflow execution sessions.
 * Maintains execution state, handles SSE connections, and coordinates
 * between API routes and workflow executor.
 */

import type {
  ExecutionSession,
  ExecutionStatus,
  ExecutionEvent,
  InteractionRequest,
  UserInput,
} from '../types/step-execution'

// Global execution sessions store
const sessions = new Map<string, ExecutionSession>()

// SSE connection handlers
const sseConnections = new Map<string, Set<(event: ExecutionEvent) => void>>()

class ExecutionManagerImpl {
  /**
   * Create a new execution session
   */
  createSession(workflowId: string): ExecutionSession {
    const now = new Date().toISOString()
    const session: ExecutionSession = {
      workflowId,
      status: 'idle',
      currentStep: 0,
      events: [],
      startedAt: now,
      updatedAt: now,
    }
    sessions.set(workflowId, session)
    return session
  }

  /**
   * Get an existing session
   */
  getSession(workflowId: string): ExecutionSession | undefined {
    return sessions.get(workflowId)
  }

  /**
   * Update session status
   */
  updateStatus(workflowId: string, status: ExecutionStatus): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.status = status
      session.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Update current step
   */
  updateCurrentStep(workflowId: string, stepId: number): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.currentStep = stepId
      session.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Set pending interaction
   */
  setPendingInteraction(workflowId: string, interaction: InteractionRequest): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.pendingInteraction = interaction
      session.status = 'waiting'
      session.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Clear pending interaction
   */
  clearPendingInteraction(workflowId: string): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.pendingInteraction = undefined
      session.status = 'running'
      session.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Add event to session history
   */
  addEvent(workflowId: string, event: ExecutionEvent): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.events.push(event)
      // Keep only last 100 events to prevent memory issues
      if (session.events.length > 100) {
        session.events = session.events.slice(-100)
      }
      session.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Emit event to all connected SSE clients
   */
  emitEvent(workflowId: string, event: ExecutionEvent): void {
    this.addEvent(workflowId, event)
    const connections = sseConnections.get(workflowId)
    if (connections) {
      connections.forEach((handler) => handler(event))
    }
  }

  /**
   * Register SSE connection
   */
  registerSSEConnection(
    workflowId: string,
    handler: (event: ExecutionEvent) => void
  ): () => void {
    if (!sseConnections.has(workflowId)) {
      sseConnections.set(workflowId, new Set())
    }
    sseConnections.get(workflowId)!.add(handler)

    // Return cleanup function
    return () => {
      const connections = sseConnections.get(workflowId)
      if (connections) {
        connections.delete(handler)
        if (connections.size === 0) {
          sseConnections.delete(workflowId)
        }
      }
    }
  }

  /**
   * Submit user input for pending interaction
   */
  submitInput(workflowId: string, input: UserInput): boolean {
    const session = sessions.get(workflowId)
    if (!session || !session.pendingInteraction) {
      return false
    }

    if (session.pendingInteraction.stepId !== input.stepId) {
      return false
    }

    // Emit input event
    this.emitEvent(workflowId, {
      type: 'input',
      timestamp: new Date().toISOString(),
      data: {
        stepId: input.stepId,
        message: 'User input received',
      },
    })

    return true
  }

  /**
   * Delete session
   */
  deleteSession(workflowId: string): void {
    sessions.delete(workflowId)
    sseConnections.delete(workflowId)
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ExecutionSession[] {
    return Array.from(sessions.values()).filter(
      (s) => s.status === 'running' || s.status === 'waiting'
    )
  }

  /**
   * Create event emitter for a workflow
   */
  createEventEmitter(workflowId: string): (event: Omit<ExecutionEvent, 'timestamp'>) => void {
    return (event) => {
      this.emitEvent(workflowId, {
        ...event,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// Export singleton instance
export const ExecutionManager = new ExecutionManagerImpl()

export default ExecutionManager

/**
 * Execution Manager
 *
 * Singleton pattern for managing workflow execution sessions.
 * Uses globalThis to ensure state is shared across all Next.js route bundles.
 */

import type {
  ExecutionSession,
  ExecutionStatus,
  ExecutionEvent,
  InteractionRequest,
  UserInput,
} from '../types/step-execution'

import type { WorkflowExecutor } from './workflow-executor'

// Use globalThis to share state across Next.js route bundles (dev + production)
type GlobalStore = {
  __em_sessions: Map<string, ExecutionSession>
  __em_executors: Map<string, WorkflowExecutor>
  __em_sse: Map<string, Set<(event: ExecutionEvent) => void>>
}

const g = globalThis as unknown as GlobalStore

if (!g.__em_sessions) {
  g.__em_sessions = new Map()
  g.__em_executors = new Map()
  g.__em_sse = new Map()
}

const sessions = g.__em_sessions
const executors = g.__em_executors
const sseConnections = g.__em_sse

class ExecutionManagerImpl {
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

  getSession(workflowId: string): ExecutionSession | undefined {
    return sessions.get(workflowId)
  }

  updateStatus(workflowId: string, status: ExecutionStatus): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.status = status
      session.updatedAt = new Date().toISOString()
    }
  }

  updateCurrentStep(workflowId: string, stepId: number): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.currentStep = stepId
      session.updatedAt = new Date().toISOString()
    }
  }

  setPendingInteraction(workflowId: string, interaction: InteractionRequest): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.pendingInteraction = interaction
      session.status = 'waiting'
      session.updatedAt = new Date().toISOString()
    }
  }

  clearPendingInteraction(workflowId: string): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.pendingInteraction = undefined
      session.status = 'running'
      session.updatedAt = new Date().toISOString()
    }
  }

  addEvent(workflowId: string, event: ExecutionEvent): void {
    const session = sessions.get(workflowId)
    if (session) {
      session.events.push(event)
      if (session.events.length > 100) {
        session.events = session.events.slice(-100)
      }
      session.updatedAt = new Date().toISOString()
    }
  }

  emitEvent(workflowId: string, event: ExecutionEvent): void {
    this.addEvent(workflowId, event)
    const connections = sseConnections.get(workflowId)
    if (connections) {
      connections.forEach((handler) => handler(event))
    }
  }

  registerSSEConnection(
    workflowId: string,
    handler: (event: ExecutionEvent) => void
  ): () => void {
    if (!sseConnections.has(workflowId)) {
      sseConnections.set(workflowId, new Set())
    }
    sseConnections.get(workflowId)!.add(handler)
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

  deleteSession(workflowId: string): void {
    sessions.delete(workflowId)
    sseConnections.delete(workflowId)
    executors.delete(workflowId)
  }

  getActiveSessions(): ExecutionSession[] {
    return Array.from(sessions.values()).filter(
      (s) => s.status === 'running' || s.status === 'waiting'
    )
  }

  setExecutor(workflowId: string, executor: WorkflowExecutor): void {
    executors.set(workflowId, executor)
  }

  getExecutor(workflowId: string): WorkflowExecutor | undefined {
    return executors.get(workflowId)
  }

  removeExecutor(workflowId: string): void {
    executors.delete(workflowId)
  }

  createEventEmitter(workflowId: string): (event: Omit<ExecutionEvent, 'timestamp'>) => void {
    return (event) => {
      this.emitEvent(workflowId, {
        ...event,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

export const ExecutionManager = new ExecutionManagerImpl()
export default ExecutionManager

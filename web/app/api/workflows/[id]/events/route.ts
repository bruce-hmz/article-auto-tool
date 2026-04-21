import { NextRequest } from 'next/server'
import { ExecutionManager } from '@/lib/execution/execution-manager'
import type { ExecutionEvent } from '@/lib/types/step-execution'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return new Response('Missing workflow ID', { status: 400 })
  }

  const workflowId = id

  // Create a TransformStream for SSE
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Send initial connection message
  await writer.write(encoder.encode('event: connected\ndata: {"message":"Connected to workflow events"}\n\n'))

  // Register SSE connection handler
  const cleanup = ExecutionManager.registerSSEConnection(workflowId, async (event: ExecutionEvent) => {
    try {
      const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
      await writer.write(encoder.encode(message))
    } catch (error) {
      console.error('Failed to write SSE event:', error)
    }
  })

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    cleanup()
    writer.close().catch(() => {})
  })

  // Keep-alive ping every 30 seconds
  const keepAliveInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(': keep-alive\n\n'))
    } catch {
      clearInterval(keepAliveInterval)
    }
  }, 30000)

  // Clean up on stream close
  stream.readable.pipeThrough(new TransformStream({
    flush() {
      clearInterval(keepAliveInterval)
      cleanup()
    }
  }))

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

'use client'

import { useEffect, useRef } from 'react'
import type { ExecutionEvent } from '@/lib/types/step-execution'

interface ExecutionLogProps {
  events: ExecutionEvent[]
  maxHeight?: number
  autoScroll?: boolean
}

export function ExecutionLog({
  events,
  maxHeight = 300,
  autoScroll = true,
}: ExecutionLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [events, autoScroll])

  if (events.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No events yet
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="space-y-2 overflow-y-auto"
      style={{ maxHeight }}
    >
      {events.map((event, index) => (
        <div
          key={index}
          className={`text-sm p-2 rounded ${
            event.type === 'error'
              ? 'bg-red-100 text-red-800'
              : event.type === 'completed'
              ? 'bg-green-100 text-green-800'
              : event.type === 'progress'
              ? 'bg-blue-100 text-blue-800'
              : event.type === 'waiting'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-xs font-medium uppercase">{event.type}</span>
            {event.data.stepName && (
              <span className="text-xs">
                Step {event.data.stepId}: {event.data.stepName}
              </span>
            )}
          </div>
          {event.data.message && <p className="mt-1">{event.data.message}</p>}
        </div>
      ))}
    </div>
  )
}

export default ExecutionLog

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { ExecutionEvent, InteractionRequest } from "@/lib/types/step-execution"

interface UseWorkflowExecutionOptions {
  workflowId: string
  autoStart?: boolean
}

export function useWorkflowExecution(options: UseWorkflowExecutionOptions) {
  const { workflowId, autoStart = false } = options
  const router = useRouter()
  const queryClient = useQueryClient()

  const [events, setEvents] = useState<ExecutionEvent[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingInteraction, setPendingInteraction] = useState<InteractionRequest | null>(null)

  // Subscribe to SSE events
  useEffect(() => {
    if (!workflowId) return

    const eventSource = new EventSource(`/api/workflows/${workflowId}/events`)

    eventSource.onmessage = (event) => {
      try {
        const newEvent = JSON.parse(event.data) as ExecutionEvent
        setEvents((prev) => [newEvent, ...prev])

        if (newEvent.type === "waiting" && newEvent.data.interaction) {
          setPendingInteraction(newEvent.data.interaction)
          setIsWaiting(true)
          setIsPaused(true)
        } else if (newEvent.type === "error") {
          setError(newEvent.data.error || "An error occurred")
        } else if (newEvent.type === "finished") {
          setIsWaiting(false)
          setIsPaused(false)
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err)
      }
    }

    eventSource.onerror = () => {
      console.error("SSE error")
    }

    return () => {
      eventSource.close()
    }
  }, [workflowId])

  // Fetch workflow state
  const { data: workflow, isLoading, refetch } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      if (!workflowId) return null
      const res = await fetch(`/api/workflows/${workflowId}`)
      if (!res.ok) {
        throw new Error("Failed to fetch workflow")
      }
      return res.json()
    },
    enabled: !!workflowId,
    refetchInterval: 3000,
  })

  // Start execution mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to start execution")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
      setIsPaused(false)
      setIsWaiting(false)
      setError(null)
    },
  })

  // Submit input mutation
  const submitInputMutation = useMutation({
    mutationFn: async (input: { stepId: number; type: string; value: string | boolean | string[] }) => {
      const res = await fetch(`/api/workflows/${workflowId}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to submit input")
      }
      return res.json()
    },
    onSuccess: () => {
      setPendingInteraction(null)
      setIsWaiting(false)
      setIsPaused(false)
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] })
    },
  })

  // Pause workflow
  const pauseWorkflow = useCallback(async () => {
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      })
      setIsPaused(true)
      refetch()
    } catch (err) {
      console.error("Failed to pause workflow:", err)
    }
  }, [workflowId, refetch])

  // Resume workflow
  const resumeWorkflow = useCallback(async () => {
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "running" }),
      })
      setIsPaused(false)
      setIsWaiting(false)
      refetch()
    } catch (err) {
      console.error("Failed to resume workflow:", err)
    }
  }, [workflowId, refetch])

  return {
    workflow,
    isLoading,
    events,
    isPaused,
    isWaiting,
    error,
    pendingInteraction,
    startExecution: startMutation.mutate,
    pauseWorkflow,
    resumeWorkflow,
    submitInput: submitInputMutation.mutate,
    isStarting: startMutation.isPending,
    isSubmitting: submitInputMutation.isPending,
  }
}

export default useWorkflowExecution

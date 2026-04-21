"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { MainLayout } from "@/components/layout/main-layout"
import { StepProgress } from "@/components/workflow/step-progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { STEPS } from "@/lib/constants"
import { ArrowLeft, Play, Pause, RotateCcw } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow, format } from "date-fns"
import type { ExecutionEvent, InteractionRequest } from "@/lib/types/step-execution"

export default function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const [id, setId] = useState<string>("")
  const [events, setEvents] = useState<ExecutionEvent[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingInteraction, setPendingInteraction] = useState<InteractionRequest | null>(null)
  const [input, setInput] = useState<string>("")

  useEffect(() => {
    if (params instanceof Promise) {
      params.then((p) => setId(p.id))
    } else if (params && 'id' in params) {
      setId(params.id)
    }
  }, [params])

  // Subscribe to SSE events
  useEffect(() => {
    if (!id) return

    const eventSource = new EventSource(`/api/workflows/${id}/events`)

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
      setError("Connection lost. Please refresh the page.")
    }

    return () => {
      eventSource.close()
    }
  }, [id])

  // Fetch workflow state
  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", id],
    queryFn: async () => {
      if (!id) return null
      const res = await fetch(`/api/workflows/${id}`)
      if (!res.ok) {
        throw new Error("Failed to fetch workflow")
      }
      return res.json()
    },
    enabled: !!id,
    refetchInterval: 3000,
  })

  const steps = STEPS

  // Handle user input submission
  const handleSubmitInput = async () => {
    if (!input || !pendingInteraction) return

    try {
      const res = await fetch(`/api/workflows/${id}/input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: pendingInteraction.stepId,
          type: pendingInteraction.type,
          value: input,
        }),
      })

      if (res.ok) {
        setPendingInteraction(null)
        setIsWaiting(false)
        setIsPaused(false)
        setInput("")
      } else {
        const errorData = await res.json()
        setError(errorData.error || "Failed to submit input")
      }
    } catch (err) {
      console.error("Failed to submit input:", err)
      setError("Failed to submit input")
    }
  }

  // Handle pause
  const handlePause = async () => {
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      })
      setIsPaused(true)
    } catch (err) {
      console.error("Failed to pause workflow:", err)
    }
  }

  // Handle resume
  const handleResume = async () => {
    try {
      await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "running" }),
      })
      setIsPaused(false)
      setIsWaiting(false)
    } catch (err) {
      console.error("Failed to resume workflow:", err)
    }
  }

  // Handle retry
  const handleRetry = async () => {
    try {
      await fetch(`/api/workflows/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      setError(null)
      setIsPaused(false)
      setIsWaiting(false)
    } catch (err) {
      console.error("Failed to retry workflow:", err)
      setError("Failed to retry workflow")
    }
  }

  if (isLoading || !id) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading workflow...</div>
        </div>
      </MainLayout>
    )
  }

  if (!workflow) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-muted-foreground mb-4">Workflow not found</div>
          <Link href="/workflows">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workflows
            </Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "success"> = {
    running: "default",
    paused: "secondary",
    completed: "success",
    failed: "destructive",
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {(workflow.metadata?.title as string) || `Workflow ${id.slice(0, 8)}`}
              </h1>
              <Badge variant={statusVariants[workflow.status]}>
                {workflow.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Mode: {workflow.mode} - Started{" "}
              {formatDistanceToNow(new Date(workflow.startedAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-2">
            {workflow.status === "running" && !isPaused && (
              <Button variant="outline" onClick={handlePause}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            {(workflow.status === "paused" || isPaused) && !isWaiting && (
              <Button variant="outline" onClick={handleResume}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            {workflow.status === "failed" && (
              <Button variant="outline" onClick={handleRetry}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Workflow ID</span>
                <span className="font-mono text-xs">{id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode</span>
                <span>{workflow.mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Step</span>
                <span>{workflow.currentStep} / {steps.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account</span>
                <span>{workflow.accountId || "Not selected"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started</span>
                <span>{format(new Date(workflow.startedAt), "PPpp")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(new Date(workflow.updatedAt), "PPpp")}</span>
              </div>
              {workflow.outputPath && (
                <div>
                  <span className="text-muted-foreground">Output Path</span>
                  <div className="font-mono text-xs mt-1 p-2 bg-muted rounded">
                    {workflow.outputPath}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Step Progress</CardTitle>
              <CardDescription>
                {steps.filter((s) => workflow.stepResults[s.id]?.status === "completed").length} of {steps.length} steps completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StepProgress
                steps={steps}
                stepResults={workflow.stepResults}
                currentStep={workflow.currentStep}
              />
            </CardContent>
          </Card>
        </div>

        {isWaiting && pendingInteraction && (
          <Card className="border-yellow-400 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">User Input Required</CardTitle>
              <CardDescription>
                Step {pendingInteraction.stepId}: {pendingInteraction.stepName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium">{pendingInteraction.message}</p>

              {pendingInteraction.type === "select" && pendingInteraction.options?.choices && (
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                >
                  <option value="">Select an option...</option>
                  {pendingInteraction.options.choices.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              )}

              {pendingInteraction.type === "input" && (
                <input
                  type="text"
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={pendingInteraction.options?.placeholder}
                />
              )}

              {pendingInteraction.type === "confirm" && (
                <p className="text-sm text-muted-foreground">
                  Please confirm to continue or cancel to abort.
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPendingInteraction(null)
                    setIsWaiting(false)
                    setInput("")
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitInput}>
                  {pendingInteraction.type === "confirm" ? "Confirm" : "Submit"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent>
              <p className="text-red-600 font-medium">Error</p>
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Execution Log</CardTitle>
              <CardDescription>Real-time events from workflow execution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.slice(0, 20).map((event, index) => (
                  <div
                    key={index}
                    className={`text-sm p-2 rounded ${
                      event.type === "error"
                        ? "bg-red-100 text-red-800"
                        : event.type === "completed"
                        ? "bg-green-100 text-green-800"
                        : event.type === "progress"
                        ? "bg-blue-100 text-blue-800"
                        : event.type === "waiting"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
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
            </CardContent>
          </Card>
        )}

        {Object.keys(workflow.metadata).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-64">
                {JSON.stringify(workflow.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}

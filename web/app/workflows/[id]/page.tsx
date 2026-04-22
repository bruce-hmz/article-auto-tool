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
          <div className="text-xs text-muted-foreground font-mono">loading...</div>
        </div>
      </MainLayout>
    )
  }

  if (!workflow) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-xs text-muted-foreground font-mono mb-4">workflow not found</div>
          <Link href="/workflows">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
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

  const infoRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-xs font-mono">{value}</span>
    </div>
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">
                {(workflow.metadata?.title as string) || `Workflow ${id.slice(0, 8)}`}
              </h1>
              <Badge variant={statusVariants[workflow.status]} className="text-[10px] font-mono">
                {workflow.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {workflow.mode} &middot; started {formatDistanceToNow(new Date(workflow.startedAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-1.5">
            {workflow.status === "running" && !isPaused && (
              <Button variant="outline" size="sm" onClick={handlePause}>
                <Pause className="h-3.5 w-3.5 mr-1.5" />
                Pause
              </Button>
            )}
            {(workflow.status === "paused" || isPaused) && !isWaiting && (
              <Button variant="outline" size="sm" onClick={handleResume}>
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Resume
              </Button>
            )}
            {workflow.status === "failed" && (
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Info</CardTitle>
            </CardHeader>
            <CardContent>
              {infoRow("ID", id.slice(0, 12))}
              {infoRow("Mode", workflow.mode)}
              {infoRow("Step", `${workflow.currentStep} / ${steps.length}`)}
              {infoRow("Account", workflow.accountId || "none")}
              {infoRow("Started", format(new Date(workflow.startedAt), "PPpp"))}
              {infoRow("Updated", format(new Date(workflow.updatedAt), "PPpp"))}
              {workflow.outputPath && (
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Output</span>
                  <div className="font-mono text-[10px] mt-1 p-2 bg-muted">
                    {workflow.outputPath}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</CardTitle>
              <CardDescription className="text-xs font-mono">
                {steps.filter((s) => workflow.stepResults[s.id]?.status === "completed").length}/{steps.length} steps
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
          <Card className="border-l-2 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="text-sm">Input Required</CardTitle>
              <CardDescription className="text-xs font-mono">
                step {pendingInteraction.stepId}: {pendingInteraction.stepName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs font-medium">{pendingInteraction.message}</p>

              {pendingInteraction.type === "select" && pendingInteraction.options?.choices && (
                <select
                  className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                >
                  <option value="">Select...</option>
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
                  className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={pendingInteraction.options?.placeholder}
                />
              )}

              {pendingInteraction.type === "confirm" && (
                <p className="text-xs text-muted-foreground">
                  Confirm to continue, or cancel to abort.
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPendingInteraction(null)
                    setIsWaiting(false)
                    setInput("")
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmitInput}>
                  {pendingInteraction.type === "confirm" ? "Confirm" : "Submit"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-l-2 border-l-destructive">
            <CardContent className="py-3">
              <p className="text-xs text-destructive font-mono">{error}</p>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {events.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-72 overflow-y-auto font-mono text-xs">
                {events.slice(0, 30).map((event, index) => (
                  <div
                    key={index}
                    className={`py-1 px-2 flex items-center gap-2 ${
                      event.type === "error"
                        ? "text-red-600 bg-red-50 dark:bg-red-950/20"
                        : event.type === "completed"
                        ? "text-green-600 bg-green-50 dark:bg-green-950/20"
                        : event.type === "progress"
                        ? "text-primary bg-primary/5"
                        : event.type === "waiting"
                        ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20"
                        : "text-muted-foreground bg-muted"
                    }`}
                  >
                    <span className="text-[10px] text-muted-foreground w-16 shrink-0">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] font-medium uppercase w-16 shrink-0">{event.type}</span>
                    {event.data.stepName && (
                      <span className="text-[10px]">
                        {event.data.stepId}:{event.data.stepName}
                      </span>
                    )}
                    {event.data.message && (
                      <span className="truncate">{event.data.message}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {Object.keys(workflow.metadata).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted p-3 overflow-auto max-h-48">
                {JSON.stringify(workflow.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}

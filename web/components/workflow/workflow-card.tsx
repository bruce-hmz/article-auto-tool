"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Play, Pause, Trash2, Eye } from "lucide-react"
import type { WorkflowState } from "@/lib/types"
import { STEPS } from "@/lib/constants"

interface WorkflowCardProps {
  workflow: WorkflowState
  onUpdate?: () => void
}

const statusVariants: Record<WorkflowState["status"], "default" | "secondary" | "destructive" | "success"> = {
  running: "default",
  paused: "secondary",
  completed: "success",
  failed: "destructive",
}

const statusLabels: Record<WorkflowState["status"], string> = {
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
}

export function WorkflowCard({ workflow, onUpdate }: WorkflowCardProps) {
  const steps = STEPS

  const handlePause = async () => {
    await fetch(`/api/workflows/${workflow.workflowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paused" }),
    })
    onUpdate?.()
  }

  const handleResume = async () => {
    await fetch(`/api/workflows/${workflow.workflowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "running" }),
    })
    onUpdate?.()
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      await fetch(`/api/workflows/${workflow.workflowId}`, {
        method: "DELETE",
      })
      onUpdate?.()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {(workflow.metadata?.title as string) || `Workflow ${workflow.workflowId.slice(0, 8)}`}
          </CardTitle>
          <Badge variant={statusVariants[workflow.status]} className="text-[10px] font-mono">
            {statusLabels[workflow.status]}
          </Badge>
        </div>
        <CardDescription className="text-xs font-mono">
          {workflow.mode} &middot; {formatDistanceToNow(new Date(workflow.startedAt), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-xs text-muted-foreground mb-2 font-mono">
          step {workflow.currentStep}/{steps.length}
        </div>
        <div className="flex gap-0.5">
          {steps.map((step) => {
            const result = workflow.stepResults[step.id]
            const status = result?.status || "pending"

            return (
              <div
                key={step.id}
                className={`h-1.5 flex-1 ${
                  status === "completed"
                    ? "bg-green-500"
                    : status === "in_progress"
                    ? "bg-primary"
                    : status === "failed"
                    ? "bg-destructive"
                    : "bg-muted"
                }`}
                title={step.name}
              />
            )
          })}
        </div>
      </CardContent>
      <CardFooter className="gap-1.5">
        <Link href={`/workflows/${workflow.workflowId}`}>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        </Link>
        {workflow.status === "running" && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handlePause}>
            <Pause className="h-3 w-3 mr-1" />
            Pause
          </Button>
        )}
        {workflow.status === "paused" && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleResume}>
            <Play className="h-3 w-3 mr-1" />
            Resume
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  )
}

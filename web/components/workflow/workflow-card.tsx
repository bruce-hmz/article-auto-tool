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
          <CardTitle className="text-base">
            {(workflow.metadata?.title as string) || `Workflow ${workflow.workflowId.slice(0, 8)}`}
          </CardTitle>
          <Badge variant={statusVariants[workflow.status]}>
            {statusLabels[workflow.status]}
          </Badge>
        </div>
        <CardDescription>
          Mode: {workflow.mode} • Started{" "}
          {formatDistanceToNow(new Date(workflow.startedAt), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-sm text-muted-foreground mb-2">
          Step {workflow.currentStep} of {steps.length}
        </div>
        <div className="flex gap-1">
          {steps.map((step) => {
            const result = workflow.stepResults[step.id]
            const status = result?.status || "pending"

            return (
              <div
                key={step.id}
                className={`h-2 flex-1 rounded-full ${
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
      <CardFooter className="gap-2">
        <Link href={`/workflows/${workflow.workflowId}`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </Link>
        {workflow.status === "running" && (
          <Button variant="outline" size="sm" onClick={handlePause}>
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        )}
        {workflow.status === "paused" && (
          <Button variant="outline" size="sm" onClick={handleResume}>
            <Play className="h-4 w-4 mr-1" />
            Resume
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

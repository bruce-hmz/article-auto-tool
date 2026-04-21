"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Step, StepStatus } from "@/lib/types"

interface StepProgressProps {
  steps: Step[]
  stepResults: Record<number, { status: StepStatus; error?: string }>
  currentStep: number
}

export function StepProgress({ steps, stepResults, currentStep }: StepProgressProps) {
  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const result = stepResults[step.id]
        const status = result?.status || (step.id < currentStep ? 'completed' : 'pending')

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 rounded-lg p-2 text-sm",
              status === 'in_progress' && "bg-primary/10",
              status === 'completed' && "bg-green-50",
              status === 'failed' && "bg-red-50"
            )}
          >
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                status === 'pending' && "bg-muted text-muted-foreground",
                status === 'in_progress' && "bg-primary text-primary-foreground",
                status === 'completed' && "bg-green-500 text-white",
                status === 'failed' && "bg-destructive text-destructive-foreground"
              )}
            >
              {status === 'completed' ? '✓' : status === 'failed' ? '✕' : step.id}
            </div>
            <div className="flex-1">
              <div className="font-medium">{step.name}</div>
              {step.isKeyCheckpoint && (
                <Badge variant="outline" className="text-xs">
                  Checkpoint
                </Badge>
              )}
            </div>
            {result?.error && (
              <span className="text-xs text-destructive truncate max-w-[200px]">
                {result.error}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

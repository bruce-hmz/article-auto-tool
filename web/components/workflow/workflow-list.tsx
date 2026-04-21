"use client"

import { useQuery } from "@tanstack/react-query"
import { WorkflowCard } from "./workflow-card"
import type { WorkflowState } from "@/lib/types"

interface WorkflowListProps {
  initialData?: WorkflowState[]
  onUpdate?: () => void
}

export function WorkflowList({ initialData, onUpdate }: WorkflowListProps) {
  const { data: workflows, isLoading, refetch } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await fetch("/api/workflows")
      return res.json() as Promise<WorkflowState[]>
    },
    initialData,
  })

  const handleUpdate = () => {
    refetch()
    onUpdate?.()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading workflows...</div>
      </div>
    )
  }

  if (!workflows || workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-muted-foreground mb-4">No workflows found</div>
        <p className="text-sm text-muted-foreground">
          Create a new workflow to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow) => (
        <WorkflowCard
          key={workflow.workflowId}
          workflow={workflow}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  )
}

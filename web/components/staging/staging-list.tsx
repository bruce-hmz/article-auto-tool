"use client"

import { useQuery } from "@tanstack/react-query"
import { StagingCard } from "./staging-card"
import type { StagingListItem } from "@/lib/types"

interface StagingListProps {
  initialData?: StagingListItem[]
  filter?: "all" | "failed" | "pending" | "success"
  onUpdate?: () => void
}

export function StagingList({ initialData, filter = "all", onUpdate }: StagingListProps) {
  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ["staging", filter],
    queryFn: async () => {
      const res = await fetch("/api/staging")
      const data = await res.json() as StagingListItem[]
      if (filter === "failed") {
        return data.filter(item => item.status === "failed")
      }
      if (filter === "pending") {
        return data.filter(item => item.status === "pending")
      }
      if (filter === "success") {
        return data.filter(item => item.status === "success")
      }
      return data
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
        <div className="text-muted-foreground">Loading staging data...</div>
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-muted-foreground mb-4">
          {filter === "failed"
            ? "No failed articles"
            : filter === "pending"
            ? "No pending articles"
            : filter === "success"
            ? "No published articles"
            : "No staged articles found"}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <StagingCard key={item.workflowId} item={item} onUpdate={handleUpdate} />
      ))}
    </div>
  )
}

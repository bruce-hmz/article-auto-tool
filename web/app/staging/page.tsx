"use client"

import { useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { StagingList } from "@/components/staging/staging-list"
import { Button } from "@/components/ui/button"
import { FileStack, AlertTriangle, CheckCircle, Clock } from "lucide-react"

type FilterType = "all" | "failed" | "pending" | "success"

export default function StagingPage() {
  const [filter, setFilter] = useState<FilterType>("all")

  const filters: { value: FilterType; label: string; icon: typeof FileStack }[] = [
    { value: "all", label: "All", icon: FileStack },
    { value: "pending", label: "Pending", icon: Clock },
    { value: "failed", label: "Failed", icon: AlertTriangle },
    { value: "success", label: "Published", icon: CheckCircle },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Staging</h1>
            <p className="text-xs text-muted-foreground font-mono">
              articles waiting for publishing or retry
            </p>
          </div>
        </div>

        <div className="flex gap-1">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
              className="gap-1.5 h-7 text-xs"
            >
              <f.icon className="h-3 w-3" />
              {f.label}
            </Button>
          ))}
        </div>

        <StagingList filter={filter} />
      </div>
    </MainLayout>
  )
}

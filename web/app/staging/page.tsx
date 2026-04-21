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
            <h1 className="text-2xl font-bold">Staging Area</h1>
            <p className="text-muted-foreground">
              Manage articles waiting for publishing or retry
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              onClick={() => setFilter(f.value)}
              className="gap-2"
            >
              <f.icon className="h-4 w-4" />
              {f.label}
            </Button>
          ))}
        </div>

        <StagingList filter={filter} />
      </div>
    </MainLayout>
  )
}

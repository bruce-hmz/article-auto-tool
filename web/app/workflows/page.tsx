"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { WorkflowList } from "@/components/workflow/workflow-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import type { WorkflowMode } from "@/lib/types"

export default function WorkflowsPage() {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedMode, setSelectedMode] = useState<WorkflowMode>("auto")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const queryClient = useQueryClient()

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts")
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { mode: WorkflowMode; accountId?: string }) => {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create workflow")
      }
      return res.json()
    },
    onSuccess: async (workflow) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] })
      setShowCreateModal(false)
      setSelectedMode("auto")
      setSelectedAccountId("")

      if (workflow?.workflowId) {
        try {
          await fetch(`/api/workflows/${workflow.workflowId}/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
          router.push(`/workflows/${workflow.workflowId}`)
        } catch (error) {
          console.error("Failed to start execution:", error)
          router.push(`/workflows/${workflow.workflowId}`)
        }
      }
    },
  })

  const handleCreate = () => {
    const data: { mode: WorkflowMode; accountId?: string } = { mode: selectedMode }
    if (selectedAccountId) {
      data.accountId = selectedAccountId
    }
    createMutation.mutate(data)
  }

  const modes: { value: WorkflowMode; label: string; description: string }[] = [
    { value: "auto", label: "Auto", description: "Run all steps automatically" },
    { value: "key_checkpoint", label: "Key Checkpoint", description: "Pause at key steps" },
    { value: "step_by_step", label: "Step by Step", description: "Pause after each step" },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Workflows</h1>
            <p className="text-xs text-muted-foreground font-mono">
              article generation and publishing
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Workflow
          </Button>
        </div>

        {showCreateModal && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Create New Workflow</CardTitle>
              <CardDescription className="text-xs">Choose a mode and optionally select an account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {modes.map((mode) => (
                      <Button
                        key={mode.value}
                        variant={selectedMode === mode.value ? "default" : "outline"}
                        onClick={() => setSelectedMode(mode.value)}
                        className="h-auto py-3"
                      >
                        <div className="text-center">
                          <div className="text-xs font-medium">{mode.label}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {mode.description}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Account (Optional)
                  </label>
                  <select
                    className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                  >
                    <option value="">Select an account...</option>
                    {accounts?.map((account: { id: string; name: string }) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                {createMutation.error && (
                  <div className="text-xs text-destructive font-mono">
                    {(createMutation.error as Error).message}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreateModal(false)
                      setSelectedMode("auto")
                      setSelectedAccountId("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <WorkflowList />
      </div>
    </MainLayout>
  )
}

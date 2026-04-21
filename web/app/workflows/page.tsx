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

      // Auto-start execution and navigate to workflow detail page
      if (workflow?.workflowId) {
        try {
          // Start execution
          await fetch(`/api/workflows/${workflow.workflowId}/execute`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
          // Navigate to workflow detail page
          router.push(`/workflows/${workflow.workflowId}`)
        } catch (error) {
          console.error("Failed to start execution:", error)
          // Still navigate even if execution start fails
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
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-muted-foreground">
              Manage your article generation and publishing workflows
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>

        {showCreateModal && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Workflow</CardTitle>
              <CardDescription>
                Choose a mode and optionally select an account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {modes.map((mode) => (
                      <Button
                        key={mode.value}
                        variant={selectedMode === mode.value ? "default" : "outline"}
                        onClick={() => setSelectedMode(mode.value)}
                        className="h-auto py-4"
                      >
                        <div className="text-center">
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {mode.description}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Account (Optional)
                  </label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  <div className="text-sm text-destructive">
                    {(createMutation.error as Error).message}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false)
                      setSelectedMode("auto")
                      setSelectedAccountId("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
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

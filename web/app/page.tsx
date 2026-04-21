"use client"

import { useQuery } from "@tanstack/react-query"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WorkflowList } from "@/components/workflow/workflow-list"
import { StagingList } from "@/components/staging/staging-list"
import {
  Play,
  FileWarning,
  Activity,
  CheckCircle,
  Pause,
  XCircle,
} from "lucide-react"

export default function DashboardPage() {
  const { data: workflowStats } = useQuery({
    queryKey: ["workflow-stats"],
    queryFn: async () => {
      const res = await fetch("/api/workflows")
      const workflows = await res.json()
      return {
        total: workflows.length,
        running: workflows.filter((w: { status: string }) => w.status === "running").length,
        paused: workflows.filter((w: { status: string }) => w.status === "paused").length,
        completed: workflows.filter((w: { status: string }) => w.status === "completed").length,
        failed: workflows.filter((w: { status: string }) => w.status === "failed").length,
      }
    },
  })

  const { data: stagingStats } = useQuery({
    queryKey: ["staging-stats"],
    queryFn: async () => {
      const res = await fetch("/api/staging")
      const items = await res.json()
      return {
        total: items.length,
        pending: items.filter((i: { status: string }) => i.status === "pending").length,
        failed: items.filter((i: { status: string }) => i.status === "failed").length,
      }
    },
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button onClick={() => window.location.href = '/workflows'}>
            <Play className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflowStats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Running</CardTitle>
              <Play className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {workflowStats?.running || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paused</CardTitle>
              <Pause className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflowStats?.paused || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {workflowStats?.completed || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {workflowStats?.failed || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {stagingStats?.failed && stagingStats.failed > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">
                  Failed Articles Need Attention
                </CardTitle>
              </div>
              <CardDescription>
                {stagingStats.failed} article(s) failed to publish and require retry
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Recent Workflows */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Workflows</h2>
          <WorkflowList />
        </div>

        {/* Failed Staging */}
        {stagingStats?.failed && stagingStats.failed > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Failed Staging</h2>
            <StagingList filter="failed" />
          </div>
        )}
      </div>
    </MainLayout>
  )
}

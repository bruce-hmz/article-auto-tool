"use client"

import { useQuery } from "@tanstack/react-query"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Users,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

function StatSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-3 w-20 bg-muted animate-pulse" />
        <div className="h-3.5 w-3.5 bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-10 bg-muted animate-pulse" />
      </CardContent>
    </Card>
  )
}

function WelcomeCard() {
  return (
    <Card className="border-l-2 border-l-primary">
      <CardContent className="flex items-center justify-between py-5">
        <div>
          <h2 className="text-sm font-semibold">Get started</h2>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            add a WeChat account, configure your brief, start generating articles.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" asChild>
              <Link href="/accounts">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Add Account
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/workflows">
                <Play className="h-3.5 w-3.5 mr-1.5" />
                New Workflow
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { data: workflowStats, isLoading: statsLoading } = useQuery({
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

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts")
      if (!res.ok) return []
      return res.json() as Promise<{ id: string }[]>
    },
  })

  const isEmpty = accounts?.length === 0 && workflowStats?.total === 0

  const stats = [
    { title: "Total", value: workflowStats?.total || 0, icon: Activity, color: "" },
    { title: "Running", value: workflowStats?.running || 0, icon: Play, color: "text-primary" },
    { title: "Paused", value: workflowStats?.paused || 0, icon: Pause, color: "text-muted-foreground" },
    { title: "Completed", value: workflowStats?.completed || 0, icon: CheckCircle, color: "text-green-500" },
    { title: "Failed", value: workflowStats?.failed || 0, icon: XCircle, color: "text-destructive" },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <Button size="sm" asChild>
            <Link href="/workflows">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              New Workflow
            </Link>
          </Button>
        </div>

        {isEmpty && <WelcomeCard />}

        {/* Stats */}
        <div className="grid gap-3 grid-cols-5">
          {statsLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color || "text-muted-foreground"}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-mono font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Failed articles alert */}
        {stagingStats?.failed && stagingStats.failed > 0 && (
          <Card className="border-l-2 border-l-destructive">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileWarning className="h-4 w-4 text-destructive" />
                <CardTitle className="text-sm text-destructive">
                  {stagingStats.failed} article(s) failed
                </CardTitle>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Recent Workflows */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recent Workflows</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/workflows" className="text-xs font-mono">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <WorkflowList />
        </div>

        {/* Failed Staging */}
        {stagingStats?.failed && stagingStats.failed > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3">Failed Staging</h2>
            <StagingList filter="failed" />
          </div>
        )}
      </div>
    </MainLayout>
  )
}

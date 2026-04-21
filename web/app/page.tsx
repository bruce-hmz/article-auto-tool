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
 Users,
 ArrowRight,
} from "lucide-react"
import Link from "next/link"

function StatSkeleton() {
 return (
 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <div className="h-4 w-24 bg-muted animate-pulse rounded" />
 <div className="h-4 w-4 bg-muted animate-pulse rounded" />
 </CardHeader>
 <CardContent>
 <div className="h-8 w-12 bg-muted animate-pulse rounded" />
 </CardContent>
 </Card>
 )
}

function WelcomeCard() {
 return (
 <Card className="border-primary/20 bg-primary/5">
 <CardContent className="flex items-center justify-between py-6">
 <div>
 <h2 className="text-lg font-semibold">Get started with Auto Tool</h2>
 <p className="text-sm text-muted-foreground mt-1">
 Add a WeChat account, configure your editorial brief, and start generating articles.
 </p>
 <div className="flex gap-2 mt-3">
 <Button size="sm" asChild>
 <Link href="/accounts">
 <Users className="h-4 w-4 mr-1" />
 Add Account
 </Link>
 </Button>
 <Button size="sm" variant="outline" asChild>
 <Link href="/workflows">
 <Play className="h-4 w-4 mr-1" />
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

 return (
 <MainLayout>
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold">Dashboard</h1>
 <Button asChild>
 <Link href="/workflows">
 <Play className="h-4 w-4 mr-2" />
 New Workflow
 </Link>
 </Button>
 </div>

 {/* Welcome card for new users */}
 {isEmpty && <WelcomeCard />}

 {/* Stats Cards */}
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
 {statsLoading ? (
 <>
 <StatSkeleton />
 <StatSkeleton />
 <StatSkeleton />
 <StatSkeleton />
 <StatSkeleton />
 </>
 ) : (
 <>
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
 </>
 )}
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
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-lg font-semibold">Recent Workflows</h2>
 <Button variant="ghost" size="sm" asChild>
 <Link href="/workflows">
 View all <ArrowRight className="h-4 w-4 ml-1" />
 </Link>
 </Button>
 </div>
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

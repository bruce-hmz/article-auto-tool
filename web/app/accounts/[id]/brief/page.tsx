"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BriefForm } from "@/components/brief/brief-form"
import { ArrowLeft, Eye, Pencil } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

interface BriefData {
  voice?: string
  audience?: string
  tone?: string
  topicDomains?: { include: string[]; exclude: string[] }
}

function BriefPreview({ brief }: { brief: BriefData | null }) {
  if (!brief || (!brief.voice && !brief.audience && !brief.tone && !brief.topicDomains)) {
    return (
      <div className="text-xs text-muted-foreground font-mono">
        No brief configured yet. Fill in the form below.
      </div>
    )
  }

  const labelClass = "text-xs font-medium text-muted-foreground uppercase tracking-wider"

  return (
    <div className="space-y-4">
      {brief.voice && (
        <div>
          <dt className={labelClass}>Voice</dt>
          <dd className="mt-1 text-sm">{brief.voice}</dd>
        </div>
      )}
      {brief.audience && (
        <div>
          <dt className={labelClass}>Audience</dt>
          <dd className="mt-1 text-sm">{brief.audience}</dd>
        </div>
      )}
      {brief.tone && (
        <div>
          <dt className={labelClass}>Tone</dt>
          <dd className="mt-1">
            <Badge variant="secondary" className="font-mono capitalize text-xs">{brief.tone}</Badge>
          </dd>
        </div>
      )}
      {brief.topicDomains && (
        <div>
          <dt className={`${labelClass} mb-1.5`}>Topics</dt>
          {brief.topicDomains.include && brief.topicDomains.include.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {brief.topicDomains.include.map((tag, i) => (
                <span key={i} className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5">{tag}</span>
              ))}
            </div>
          )}
          {brief.topicDomains.exclude && brief.topicDomains.exclude.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {brief.topicDomains.exclude.map((tag, i) => (
                <span key={i} className="text-xs font-mono text-destructive bg-destructive/10 px-1.5 py-0.5">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BriefPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const accountId = params.id as string
  const [showPreview, setShowPreview] = useState(false)

  const { data: account } = useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}`)
      if (!res.ok) throw new Error("Failed to fetch account")
      return res.json()
    },
  })

  const { data: brief, isLoading: briefLoading } = useQuery({
    queryKey: ["brief", accountId],
    queryFn: async () => {
      const res = await fetch(`/api/briefs/${accountId}`)
      if (!res.ok) return null
      return res.json() as Promise<BriefData | null>
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/briefs/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to save brief")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brief", accountId] })
      toast.success("Editorial brief saved")
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/accounts")}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <><Pencil className="h-3.5 w-3.5 mr-1.5" />Edit</>
            ) : (
              <><Eye className="h-3.5 w-3.5 mr-1.5" />Preview</>
            )}
          </Button>
        </div>

        <div>
          <h1 className="text-lg font-semibold">Editorial Brief</h1>
          <p className="text-xs text-muted-foreground font-mono">
            {account ? `configure writing style for ${account.name}` : "loading..."}
          </p>
        </div>

        {showPreview ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Brief</CardTitle>
              <CardDescription className="text-xs">Read-only preview</CardDescription>
            </CardHeader>
            <CardContent>
              <BriefPreview brief={brief ?? null} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Writing Style Configuration</CardTitle>
              <CardDescription className="text-xs">
                Define voice, audience, and tone for articles on this account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {briefLoading ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-muted animate-pulse" />
                    <div className="h-16 w-full bg-muted animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-muted animate-pulse" />
                    <div className="h-16 w-full bg-muted animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-12 bg-muted animate-pulse" />
                    <div className="h-9 w-full bg-muted animate-pulse" />
                  </div>
                </div>
              ) : (
                <BriefForm
                  brief={brief ?? null}
                  onSubmit={(data) => saveMutation.mutateAsync(data as Record<string, unknown>)}
                  loading={saveMutation.isPending}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}

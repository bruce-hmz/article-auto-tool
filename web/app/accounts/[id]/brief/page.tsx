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
      <div className="text-sm text-muted-foreground italic">
        No brief configured yet. Fill in the form below to define your writing style.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {brief.voice && (
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice</dt>
          <dd className="mt-0.5 text-sm">{brief.voice}</dd>
        </div>
      )}
      {brief.audience && (
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Audience</dt>
          <dd className="mt-0.5 text-sm">{brief.audience}</dd>
        </div>
      )}
      {brief.tone && (
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tone</dt>
          <dd className="mt-0.5">
            <Badge variant="secondary" className="capitalize">{brief.tone}</Badge>
          </dd>
        </div>
      )}
      {brief.topicDomains && (
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Topics</dt>
          {brief.topicDomains.include && brief.topicDomains.include.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {brief.topicDomains.include.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-green-600 border-green-200 dark:border-green-800">{tag}</Badge>
              ))}
            </div>
          )}
          {brief.topicDomains.exclude && brief.topicDomains.exclude.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {brief.topicDomains.exclude.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-red-600 border-red-200 dark:border-red-800">{tag}</Badge>
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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <><Pencil className="h-4 w-4 mr-2" />Edit</>
            ) : (
              <><Eye className="h-4 w-4 mr-2" />Preview</>
            )}
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">Editorial Brief</h1>
          <p className="text-muted-foreground">
            {account ? `Configure writing style for ${account.name}` : "Loading..."}
          </p>
        </div>

        {showPreview ? (
          <Card>
            <CardHeader>
              <CardTitle>Current Brief</CardTitle>
              <CardDescription>
                Read-only preview of your editorial brief settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BriefPreview brief={brief ?? null} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Writing Style Configuration</CardTitle>
              <CardDescription>
                Define the voice, audience, and tone for articles published to this account.
                These settings override the defaults when generating content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {briefLoading ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-20 w-full bg-muted animate-pulse rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                    <div className="h-20 w-full bg-muted animate-pulse rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-9 w-full bg-muted animate-pulse rounded" />
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

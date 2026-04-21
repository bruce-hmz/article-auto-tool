"use client"

import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RefreshCw, Trash2 } from "lucide-react"
import type { StagingListItem } from "@/lib/types"

interface StagingCardProps {
  item: StagingListItem
  onUpdate?: () => void
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "success" | "warning"> = {
  pending: "secondary",
  success: "success",
  failed: "destructive",
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  success: "Published",
  failed: "Failed",
}

export function StagingCard({ item, onUpdate }: StagingCardProps) {
  const handleRetry = async () => {
    await fetch(`/api/staging/${item.workflowId}/retry`, {
      method: "POST",
    })
    onUpdate?.()
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this staging record?")) {
      await fetch(`/api/staging/${item.workflowId}`, {
        method: "DELETE",
      })
      onUpdate?.()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base line-clamp-1">{item.title}</CardTitle>
          <Badge variant={statusVariants[item.status]}>
            {statusLabels[item.status]}
          </Badge>
        </div>
        <CardDescription>
          Account: {item.accountId} • Updated{" "}
          {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-sm text-muted-foreground">
          Retry count: {item.retryCount}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        {item.status === "failed" && (
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

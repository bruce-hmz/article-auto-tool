"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AccountFormProps {
  account?: {
    id: string
    name: string
    appId: string
    hasAppSecret: boolean
    config?: {
      defaultTheme?: string
      imageStyle?: string
      publishing?: {
        defaultAuthor?: string
        autoPublish?: boolean
      }
    }
  }
  onSubmit: (data: {
    name: string
    appId: string
    appSecret?: string
    config?: {
      defaultTheme?: string
      imageStyle?: string
      publishing?: { defaultAuthor?: string; autoPublish?: boolean }
    }
  }) => Promise<void>
  onCancel: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

export function AccountForm({ account, onSubmit, onCancel }: AccountFormProps) {
  const isEditing = !!account
  const [name, setName] = useState(account?.name ?? "")
  const [appId, setAppId] = useState(account?.appId ?? "")
  const [appSecret, setAppSecret] = useState("")
  const [defaultTheme, setDefaultTheme] = useState(account?.config?.defaultTheme ?? "")
  const [imageStyle, setImageStyle] = useState(account?.config?.imageStyle ?? "")
  const [defaultAuthor, setDefaultAuthor] = useState(account?.config?.publishing?.defaultAuthor ?? "")
  const [autoPublish, setAutoPublish] = useState(account?.config?.publishing?.autoPublish ?? false)
  const [loading, setLoading] = useState(false)

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const markTouched = useCallback((field: string) => {
    setTouched((t) => ({ ...t, [field]: true }))
  }, [])

  const nameError = touched.name && !name.trim() ? "Account name is required" : undefined
  const appIdError = touched.appId && !appId.trim() ? "App ID is required" : undefined
  const secretError = !isEditing && touched.appSecret && !appSecret.trim() ? "App Secret is required" : undefined
  const hasErrors = !name.trim() || !appId.trim() || (!isEditing && !appSecret.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, appId: true, appSecret: true })
    if (hasErrors) return

    setLoading(true)
    try {
      const config: Record<string, unknown> = {}
      if (defaultTheme) config.defaultTheme = defaultTheme
      if (imageStyle) config.imageStyle = imageStyle
      if (defaultAuthor || autoPublish) {
        const publishing: Record<string, unknown> = {}
        if (defaultAuthor) publishing.defaultAuthor = defaultAuthor
        if (autoPublish) publishing.autoPublish = autoPublish
        config.publishing = publishing
      }

      await onSubmit({
        name: name.trim(),
        appId: appId.trim(),
        appSecret: appSecret.trim() || undefined,
        config: Object.keys(config).length > 0 ? config as any : undefined,
      })
    } catch {
      // Error handled by parent toast
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (hasError?: string) =>
    cn(
      "w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
      hasError ? "border-destructive" : "border-gray-300 dark:border-gray-700"
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Account" : "Add WeChat Account"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Account Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => markTouched("name")}
              className={inputClass(nameError)}
              placeholder="e.g. My WeChat Account"
            />
            <FieldError message={nameError} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">App ID *</label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              onBlur={() => markTouched("appId")}
              className={inputClass(appIdError)}
              placeholder="WeChat Official Account App ID"
            />
            <FieldError message={appIdError} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              App Secret {isEditing ? "(leave empty to keep current)" : "*"}
            </label>
            <input
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              onBlur={() => markTouched("appSecret")}
              className={inputClass(secretError)}
              placeholder={isEditing ? "Enter new secret to update" : "WeChat Official Account App Secret"}
            />
            <FieldError message={secretError} />
          </div>

          <div className="border-t dark:border-gray-700 pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3 text-muted-foreground">Optional Settings</h4>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Default Theme</label>
            <input
              type="text"
              value={defaultTheme}
              onChange={(e) => setDefaultTheme(e.target.value)}
              className={inputClass()}
              placeholder="e.g. elegant, modern-tech"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image Style</label>
            <input
              type="text"
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
              className={inputClass()}
              placeholder="e.g. modern minimalist, watercolor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Default Author</label>
            <input
              type="text"
              value={defaultAuthor}
              onChange={(e) => setDefaultAuthor(e.target.value)}
              className={inputClass()}
              placeholder="Author name for published articles"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoPublish"
              checked={autoPublish}
              onChange={(e) => setAutoPublish(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="autoPublish" className="text-sm">Auto Publish</label>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Add Account"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

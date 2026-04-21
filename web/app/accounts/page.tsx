"use client"

import { useQuery } from "@tanstack/react-query"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, CheckCircle, XCircle, RefreshCw } from "lucide-react"

export default function AccountsPage() {
  const { data: accounts, isLoading, refetch } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts")
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading accounts...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Accounts</h1>
            <p className="text-muted-foreground">
              Manage your WeChat Official Account configurations
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {!accounts || accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <div className="text-muted-foreground mb-2">No accounts configured</div>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Add account configuration files to <code className="bg-muted px-1 rounded">config/accounts/</code> directory in the project root
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account: {
              id: string
              name: string
              appId: string
              hasValidAppId: boolean
              hasValidAppSecret: boolean
              config?: {
                defaultTheme?: string
                imageStyle?: string
                publishing?: {
                  defaultAuthor?: string
                  autoPublish?: boolean
                }
              }
            }) => {
              const isValid = account.hasValidAppId && account.hasValidAppSecret

              return (
                <Card key={account.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <Badge variant={isValid ? "success" : "destructive"}>
                        {isValid ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {isValid ? "Valid" : "Invalid"}
                      </Badge>
                    </div>
                    <CardDescription>ID: {account.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">App ID</span>
                      <span className={account.hasValidAppId ? "" : "text-destructive"}>
                        {account.hasValidAppId ? "Configured" : "Not configured"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">App Secret</span>
                      <span className={account.hasValidAppSecret ? "" : "text-destructive"}>
                        {account.hasValidAppSecret ? "Configured" : "Not configured"}
                      </span>
                    </div>
                    {account.config?.publishing?.defaultAuthor && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Default Author</span>
                        <span>{account.config.publishing.defaultAuthor}</span>
                      </div>
                    )}
                    {account.config?.publishing?.autoPublish !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Auto Publish</span>
                        <span>{account.config.publishing.autoPublish ? "Yes" : "No"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

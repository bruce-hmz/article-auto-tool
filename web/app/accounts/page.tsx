"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AccountForm } from "@/components/account/account-form"
import { Plus, Trash2, Edit, FileText, CheckCircle, RefreshCw, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface Account {
 id: string
 name: string
 appId: string
 fullAppId: string
 hasAppSecret: boolean
 hasBrief: boolean
 config?: {
 defaultTheme?: string
 imageStyle?: string
 publishing?: {
 defaultAuthor?: string
 autoPublish?: boolean
 }
 }
}

export default function AccountsPage() {
 const queryClient = useQueryClient()
 const [showForm, setShowForm] = useState(false)
 const [editingAccount, setEditingAccount] = useState<Account | null>(null)
 const [deletingId, setDeletingId] = useState<string | null>(null)

 const { data: accounts, isLoading, refetch } = useQuery({
 queryKey: ["accounts"],
 queryFn: async () => {
 const res = await fetch("/api/accounts")
 if (!res.ok) throw new Error("Failed to fetch accounts")
 return res.json() as Promise<Account[]>
 },
 })

 const createMutation = useMutation({
 mutationFn: async (data: { name: string; appId: string; appSecret?: string; config?: Record<string, unknown> }) => {
 const res = await fetch("/api/accounts", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(data),
 })
 if (!res.ok) {
 const err = await res.json()
 throw new Error(err.error || "Failed to create account")
 }
 return res.json()
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["accounts"] })
 setShowForm(false)
 toast.success("Account created")
 },
 onError: (err) => {
 toast.error(err.message)
 },
 })

 const updateMutation = useMutation({
 mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
 const res = await fetch(`/api/accounts/${id}`, {
 method: "PUT",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(data),
 })
 if (!res.ok) {
 const err = await res.json()
 throw new Error(err.error || "Failed to update account")
 }
 return res.json()
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["accounts"] })
 setEditingAccount(null)
 toast.success("Account updated")
 },
 onError: (err) => {
 toast.error(err.message)
 },
 })

 const deleteMutation = useMutation({
 mutationFn: async (id: string) => {
 const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" })
 if (!res.ok) throw new Error("Failed to delete account")
 return res.json()
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["accounts"] })
 setDeletingId(null)
 toast.success("Account deleted")
 },
 onError: (err) => {
 toast.error(err.message)
 },
 })

 const handleSubmit = async (data: {
 name: string
 appId: string
 appSecret?: string
 config?: Record<string, unknown>
 }) => {
 if (editingAccount) {
 await updateMutation.mutateAsync({ id: editingAccount.id, data })
 } else {
 await createMutation.mutateAsync(data as { name: string; appId: string; appSecret: string; config?: Record<string, unknown> })
 }
 }

 if (isLoading) {
 return (
 <MainLayout>
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <div className="h-8 w-32 bg-muted animate-pulse rounded" />
 <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
 </div>
 </div>
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 {[1, 2, 3].map((i) => (
 <Card key={i}>
 <CardHeader className="pb-2">
 <div className="h-5 w-32 bg-muted animate-pulse rounded" />
 <div className="h-3 w-48 bg-muted animate-pulse rounded mt-2" />
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 <div className="h-4 w-full bg-muted animate-pulse rounded" />
 <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
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
 <div className="flex space-x-2">
 <Button variant="outline" onClick={() => refetch()}>
 <RefreshCw className="h-4 w-4 mr-2" />
 Refresh
 </Button>
 <Button onClick={() => { setEditingAccount(null); setShowForm(true) }}>
 <Plus className="h-4 w-4 mr-2" />
 Add Account
 </Button>
 </div>
 </div>

 {showForm && (
 <AccountForm
 onCancel={() => { setShowForm(false); setEditingAccount(null) }}
 onSubmit={handleSubmit}
 />
 )}

 {editingAccount && (
 <AccountForm
 account={editingAccount}
 onCancel={() => setEditingAccount(null)}
 onSubmit={handleSubmit}
 />
 )}

 {!accounts || accounts.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-12">
 <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
 <div className="text-muted-foreground mb-2">No accounts configured</div>
 <p className="text-sm text-muted-foreground text-center max-w-md">
 Click &quot;Add Account&quot; to configure your first WeChat Official Account.
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 {accounts.map((account) => (
 <Card key={account.id}>
 <CardHeader className="pb-2">
 <div className="flex items-center justify-between">
 <CardTitle className="text-base">{account.name}</CardTitle>
 <div className="flex space-x-1">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => { setShowForm(false); setEditingAccount(account) }}
 title="Edit account"
 >
 <Edit className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => window.location.href = `/accounts/${account.id}/brief`}
 title="Edit editorial brief"
 >
 <FileText className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setDeletingId(account.id)}
 title="Delete account"
 >
 <Trash2 className="h-4 w-4 text-red-500" />
 </Button>
 </div>
 </div>
 <CardDescription>App ID: {account.appId}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-2 text-sm">
 {!account.hasBrief && (
 <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
 <AlertCircle className="h-3.5 w-3.5" />
 <span className="text-xs">No editorial brief configured</span>
 </div>
 )}
 {account.hasBrief && (
 <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
 <CheckCircle className="h-3.5 w-3.5" />
 <span className="text-xs">Brief configured</span>
 </div>
 )}
 {account.config?.defaultTheme && (
 <div className="flex justify-between">
 <span className="text-muted-foreground">Theme</span>
 <span>{account.config.defaultTheme}</span>
 </div>
 )}
 {account.config?.publishing?.defaultAuthor && (
 <div className="flex justify-between">
 <span className="text-muted-foreground">Author</span>
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
 ))}
 </div>
 )}

 {/* Delete confirmation */}
 {deletingId && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
 <Card className="w-full max-w-md mx-4">
 <CardHeader>
 <CardTitle>Delete Account</CardTitle>
 <CardDescription>
 This will permanently delete this WeChat account and its editorial brief. This action cannot be undone.
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="flex space-x-3">
 <Button
 variant="destructive"
 onClick={() => deleteMutation.mutate(deletingId)}
 disabled={deleteMutation.isPending}
 >
 {deleteMutation.isPending ? "Deleting..." : "Delete"}
 </Button>
 <Button variant="outline" onClick={() => setDeletingId(null)}>
 Cancel
 </Button>
 </div>
 </CardContent>
 </Card>
 </div>
 )}
 </div>
 </MainLayout>
 )
}

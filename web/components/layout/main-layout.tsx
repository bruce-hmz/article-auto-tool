"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export function MainLayout({ children }: { children: React.ReactNode }) {
 const [sidebarOpen, setSidebarOpen] = useState(false)

 return (
 <div className="flex h-screen">
 <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
 <div className="flex flex-1 flex-col overflow-hidden">
 <Header onMenuClick={() => setSidebarOpen(true)} />
 <main className="flex-1 overflow-auto bg-muted/30 p-4 lg:p-6">
 {children}
 </main>
 </div>
 </div>
 )
}

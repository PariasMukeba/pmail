"use client"
import { Sidebar } from "./Sidebar"
import { MobileNav } from "./MobileNav"
import { useUIStore } from "@/lib/stores/useUIStore"
import { SearchView } from "@/components/search/SearchView"
import { ComposeOverlay } from "@/components/compose/ComposeOverlay"

export function AppShell({ children }: { children: React.ReactNode }) {
  const isSearchOpen = useUIStore((s) => s.isSearchOpen)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex md:flex-col md:w-60 shrink-0 border-r border-border">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Search overlay */}
      {isSearchOpen && <SearchView />}

      {/* Compose windows */}
      <ComposeOverlay />
    </div>
  )
}

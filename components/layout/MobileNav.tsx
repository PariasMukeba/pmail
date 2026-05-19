"use client"
import { Inbox, Search, PenSquare, Menu } from "lucide-react"
import { useUIStore } from "@/lib/stores/useUIStore"
import { useComposeStore } from "@/lib/stores/useComposeStore"

export function MobileNav() {
  const { openSearch, toggleMobileNav } = useUIStore()
  const { openCompose } = useComposeStore()

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around h-14 bg-card border-t border-border safe-area-bottom">
      <button className="flex flex-col items-center gap-0.5 px-4 py-2 text-primary">
        <Inbox className="w-5 h-5" />
        <span className="text-[10px]">Inbox</span>
      </button>
      <button onClick={openSearch} className="flex flex-col items-center gap-0.5 px-4 py-2 text-muted-foreground">
        <Search className="w-5 h-5" />
        <span className="text-[10px]">Search</span>
      </button>
      <button onClick={() => openCompose()} className="flex flex-col items-center gap-0.5 px-4 py-2 text-muted-foreground">
        <PenSquare className="w-5 h-5" />
        <span className="text-[10px]">Compose</span>
      </button>
      <button onClick={toggleMobileNav} className="flex flex-col items-center gap-0.5 px-4 py-2 text-muted-foreground">
        <Menu className="w-5 h-5" />
        <span className="text-[10px]">Menu</span>
      </button>
    </nav>
  )
}

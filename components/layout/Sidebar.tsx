"use client"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useEmailStore } from "@/lib/stores/useEmailStore"
import { useComposeStore } from "@/lib/stores/useComposeStore"
import { AccountSwitcher } from "./AccountSwitcher"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Inbox, Star, Trash2, FileText, Zap, Paperclip,
  Mail, Settings, PenSquare, AtSign, LogOut
} from "lucide-react"

const SYSTEM_FOLDERS = [
  { id: "unified", label: "Unified Inbox", icon: Inbox },
  { id: "priority", label: "Priority", icon: Zap },
  { id: "attachments", label: "Attachments", icon: Paperclip },
  { id: "starred", label: "Starred", icon: Star },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "newsletters", label: "Newsletters", icon: AtSign },
]

export function Sidebar() {
  const { selectedLabel, setSelectedLabel, emails } = useEmailStore()
  const { openCompose } = useComposeStore()
  const unreadCount = emails.filter((e) => !e.isRead).length

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Mail className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-lg tracking-tight">Pmail</span>
      </div>

      {/* Account switcher */}
      <div className="px-3 py-2 border-b border-border">
        <AccountSwitcher />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="space-y-0.5">
          {SYSTEM_FOLDERS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedLabel(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                selectedLabel === id
                  ? "bg-accent/20 text-foreground font-medium border-l-2 border-primary pl-[10px]"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {id === "unified" && unreadCount > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 h-4">{unreadCount}</Badge>
              )}
            </button>
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border space-y-2">
        <Link href="/settings/accounts" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        <Button className="w-full gap-2" size="sm" onClick={() => openCompose()}>
          <PenSquare className="w-4 h-4" />
          Compose
        </Button>
      </div>
    </div>
  )
}

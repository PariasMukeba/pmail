"use client"
import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn, getInitials, formatEmailDate } from "@/lib/utils"
import type { Email } from "@/lib/types"

interface ThreadViewProps {
  emails: Email[]
  mainEmailId: string
}

export function ThreadView({ emails, mainEmailId }: ThreadViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const others = emails.filter((e) => e.id !== mainEmailId)

  if (others.length === 0) return null

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="border-t border-border pt-4 space-y-2">
      <p className="text-xs text-muted-foreground px-1">{others.length} earlier message{others.length > 1 ? "s" : ""} in this thread</p>
      {others.map((email) => (
        <div key={email.id} className="border border-border rounded-md overflow-hidden">
          <button
            onClick={() => toggle(email.id)}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent/10 transition-colors"
          >
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-[9px] bg-secondary">{getInitials(email.from.name || email.from.address)}</AvatarFallback>
            </Avatar>
            <span className="flex-1 text-left text-sm truncate">{email.from.name || email.from.address}</span>
            <span className="text-xs text-muted-foreground">{formatEmailDate(email.date)}</span>
            {expandedIds.has(email.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {expandedIds.has(email.id) && (
            <div className="px-3 pb-3 border-t border-border">
              <div
                className="text-sm text-foreground mt-2 prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: email.body }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

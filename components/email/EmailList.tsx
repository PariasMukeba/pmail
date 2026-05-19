"use client"
import { useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { EmailRow } from "./EmailRow"
import type { Email } from "@/lib/types"

interface EmailListProps {
  emails: Email[]
  selectedId?: string
  onSelect: (id: string) => void
}

export function EmailList({ emails, selectedId, onSelect }: EmailListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  })

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const email = emails[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualItem.start}px)` }}
            >
              <EmailRow
                email={email}
                isSelected={email.id === selectedId}
                onClick={() => onSelect(email.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

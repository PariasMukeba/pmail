"use client"
import { useComposeStore } from "@/lib/stores/useComposeStore"
import { ComposeWindow } from "./ComposeWindow"

export function ComposeOverlay() {
  const { windows } = useComposeStore()

  if (windows.length === 0) return null

  return (
    <div className="fixed bottom-0 right-4 z-40 flex items-end gap-2">
      {windows.map((win) => (
        <ComposeWindow key={win.id} window={win} />
      ))}
    </div>
  )
}

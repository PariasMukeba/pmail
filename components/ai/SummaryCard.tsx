"use client"
import { useState } from "react"
import useSWR from "swr"
import { Sparkles, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { Email } from "@/lib/types"

interface SummaryCardProps {
  email: Email
}

const fetcher = (url: string, init: RequestInit) => fetch(url, init).then((r) => r.json())

export function SummaryCard({ email }: SummaryCardProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    const d = localStorage.getItem("dismissed-summaries")
    return d ? JSON.parse(d).includes(email.id) : false
  })

  const { data, isLoading } = useSWR(
    email.aiSummary ? null : !dismissed ? `/api/ai/summarize` : null,
    (url) => fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailId: email.id }) }),
    { revalidateOnFocus: false }
  )

  const summary = email.aiSummary || data?.summary

  const dismiss = () => {
    const d = JSON.parse(localStorage.getItem("dismissed-summaries") || "[]")
    localStorage.setItem("dismissed-summaries", JSON.stringify([...d, email.id]))
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary uppercase tracking-wide">
          <Sparkles className="w-3 h-3" />
          AI Summary
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ) : summary ? (
        <p className="text-sm text-foreground/90 leading-relaxed">{summary}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">No summary available</p>
      )}
    </div>
  )
}

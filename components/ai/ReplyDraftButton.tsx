"use client"
import { useState } from "react"
import { Sparkles, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Email } from "@/lib/types"

interface ReplyDraftButtonProps {
  email: Email
  onDraftGenerated: (draft: string) => void
}

export function ReplyDraftButton({ email, onDraftGenerated }: ReplyDraftButtonProps) {
  const [context, setContext] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  const generate = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ai/reply-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id, context: context || undefined }),
      })
      const text = await response.text()
      onDraftGenerated(text)
      setHasDraft(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Tell AI what to say... (optional)"
        value={context}
        onChange={(e) => setContext(e.target.value)}
        className="text-sm h-8"
      />
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        onClick={generate}
        disabled={isLoading}
      >
        {hasDraft ? <RotateCcw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
        {isLoading ? "Drafting..." : hasDraft ? "Regenerate" : "✦ Draft with AI"}
      </Button>
    </div>
  )
}

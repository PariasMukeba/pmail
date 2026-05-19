"use client"
import useSWR from "swr"
import { useComposeStore } from "@/lib/stores/useComposeStore"
import type { Email } from "@/lib/types"

interface ActionSuggestionsProps {
  email: Email
}

const fetcher = (url: string, init: RequestInit) => fetch(url, init).then((r) => r.json())

export function ActionSuggestions({ email }: ActionSuggestionsProps) {
  const { openCompose } = useComposeStore()

  const { data } = useSWR(
    `/api/ai/suggest-actions`,
    (url) => fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailId: email.id }) }),
    { revalidateOnFocus: false }
  )

  const actions: string[] = data?.actions ?? []
  if (actions.length === 0) return null

  const reSubject = (s: string) => s.startsWith("Re: ") ? s : `Re: ${s}`

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => openCompose({
            to: [email.from],
            subject: reSubject(email.subject),
            inReplyToId: email.id,
            isReply: true,
          })}
          className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
          title={action}
        >
          {action}
        </button>
      ))}
    </div>
  )
}

"use client"
import { useEmailStore } from "@/lib/stores/useEmailStore"
import { EmailBody } from "@/components/email/EmailBody"

export function ReadingPane() {
  const { emails, selectedEmailId } = useEmailStore()
  const email = emails.find((e) => e.id === selectedEmailId)

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">Select an email to read</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <EmailBody email={email} />
    </div>
  )
}

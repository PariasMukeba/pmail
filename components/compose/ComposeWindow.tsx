"use client"
import { useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { X, Minus, Maximize2, Minimize2, Paperclip, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ComposeToolbar } from "./ComposeToolbar"
import { RecipientInput } from "./RecipientInput"
import { ReplyDraftButton } from "@/components/ai/ReplyDraftButton"
import { useComposeStore, type ComposeWindow as ComposeWindowType } from "@/lib/stores/useComposeStore"
import { useEmailStore } from "@/lib/stores/useEmailStore"
import { cn } from "@/lib/utils"

interface ComposeWindowProps {
  window: ComposeWindowType
}

export function ComposeWindow({ window: win }: ComposeWindowProps) {
  const { closeCompose, minimizeCompose, maximizeCompose, updateWindow } = useComposeStore()
  const { accounts } = useEmailStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write your message..." }),
    ],
    content: win.body,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      updateWindow(win.id, { body: html })
      // Auto-save debounce
      clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => saveDraft(html), 5000)
    },
  })

  const saveDraft = async (body: string) => {
    const payload = { to: win.to, cc: win.cc, bcc: win.bcc, subject: win.subject, body, accountId: win.fromAccountId }
    if (win.draftId) {
      await fetch(`/api/drafts/${win.draftId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    } else {
      const res = await fetch("/api/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json() as { id: string }
      updateWindow(win.id, { draftId: data.id, isDraft: true })
    }
  }

  const send = async () => {
    const payload = { accountId: win.fromAccountId || accounts[0]?.id, to: win.to, cc: win.cc, bcc: win.bcc, subject: win.subject, body: win.body, inReplyToId: win.inReplyToId }
    await fetch("/api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    closeCompose(win.id)
  }

  if (win.isMinimized) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-t-lg cursor-pointer hover:bg-accent/10 min-w-[200px]"
        onClick={() => maximizeCompose(win.id)}>
        <span className="text-sm truncate flex-1">{win.subject || "New Message"}</span>
        <button onClick={(e) => { e.stopPropagation(); closeCompose(win.id) }} className="text-muted-foreground hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col bg-card border border-border shadow-2xl",
      isFullscreen
        ? "fixed inset-4 rounded-xl z-50"
        : "w-[560px] h-[480px] rounded-t-xl"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 rounded-t-xl">
        <span className="text-sm font-medium truncate">{win.subject || "New Message"}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => minimizeCompose(win.id)} className="p-1 rounded hover:bg-accent text-muted-foreground">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1 rounded hover:bg-accent text-muted-foreground">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => closeCompose(win.id)} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="border-b border-border">
        <div className="flex items-center px-3 py-1.5 border-b border-border/50">
          <span className="text-xs text-muted-foreground w-8 shrink-0">To</span>
          <RecipientInput value={win.to} onChange={(to) => updateWindow(win.id, { to })} />
        </div>
        <div className="flex items-center px-3 py-1.5 border-b border-border/50">
          <span className="text-xs text-muted-foreground w-8 shrink-0">Subj</span>
          <Input
            value={win.subject}
            onChange={(e) => updateWindow(win.id, { subject: e.target.value })}
            placeholder="Subject"
            className="border-0 bg-transparent h-7 px-0 focus-visible:ring-0 text-sm"
          />
        </div>
      </div>

      {/* AI Draft */}
      {win.isReply && (
        <div className="px-3 pt-2">
          <ReplyDraftButton
            email={{ id: win.inReplyToId!, from: { name: "", address: "" }, to: [], subject: win.subject, preview: "", body: "", date: new Date(), isRead: true, isStarred: false, labels: [], hasAttachments: false, aiPriority: "normal", aiSummary: null, isDraft: false, threadId: "", accountId: "" }}
            onDraftGenerated={(draft) => { editor?.commands.setContent(draft); updateWindow(win.id, { body: draft }) }}
          />
        </div>
      )}

      {/* Toolbar */}
      <ComposeToolbar editor={editor} />

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <EditorContent editor={editor} className="prose prose-invert prose-sm max-w-none min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[100px]" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border">
        <button className="p-1.5 rounded hover:bg-accent text-muted-foreground">
          <Paperclip className="w-4 h-4" />
        </button>
        <Button size="sm" className="gap-1.5 h-8" onClick={send} disabled={win.to.length === 0}>
          <Send className="w-3.5 h-3.5" />
          Send
        </Button>
      </div>
    </div>
  )
}

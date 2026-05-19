"use client"
import type { Editor } from "@tiptap/react"
import { Bold, Italic, Strikethrough, List, ListOrdered, Quote, Code } from "lucide-react"
import { cn } from "@/lib/utils"

interface ComposeToolbarProps {
  editor: Editor | null
}

export function ComposeToolbar({ editor }: ComposeToolbarProps) {
  if (!editor) return null

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), label: "Bold" },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), label: "Italic" },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), label: "Strike" },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), label: "Bullet List" },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), label: "Ordered List" },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote"), label: "Quote" },
    { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), label: "Code" },
  ]

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border">
      {tools.map(({ icon: Icon, action, active, label }) => (
        <button
          key={label}
          onClick={action}
          title={label}
          className={cn(
            "p-1.5 rounded hover:bg-accent transition-colors",
            active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  )
}

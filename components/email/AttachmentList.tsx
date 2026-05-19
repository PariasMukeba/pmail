import { FileText, Download, Image, FileArchive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/utils"
import type { Attachment } from "@/lib/types"

interface AttachmentListProps {
  attachments: Attachment[]
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image
  if (mimeType.includes("zip") || mimeType.includes("archive")) return FileArchive
  return FileText
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
      {attachments.map((att) => {
        const Icon = getFileIcon(att.mimeType)
        return (
          <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card text-sm">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium text-xs">{att.name}</div>
              <div className="text-[11px] text-muted-foreground">{formatFileSize(att.size)}</div>
            </div>
            {att.url && (
              <Button variant="ghost" size="icon" className="w-6 h-6 ml-1" asChild>
                <a href={att.url} download={att.name}>
                  <Download className="w-3 h-3" />
                </a>
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

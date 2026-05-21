"use client";
import { Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatEmailDate, getInitials } from "@/lib/utils";
import type { Email } from "@/lib/types";

interface EmailRowProps {
  email: Email;
  isSelected: boolean;
  onClick: () => void;
}

export function EmailRow({ email, isSelected, onClick }: EmailRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "email-row flex items-center gap-3 px-3 cursor-pointer transition-colors border-b border-border",
        "hover:bg-accent/10 focus-visible:outline-none focus-visible:bg-accent/10",
        isSelected && "bg-accent/20 border-l-2 border-primary",
        !email.isRead && "bg-muted/30",
      )}
    >
      {/* Unread indicator */}
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          email.isRead ? "bg-transparent" : "bg-primary",
        )}
      />

      {/* Avatar */}
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="text-[10px] bg-secondary">
          {getInitials(email.from.name || email.from.address)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              email.isRead
                ? "text-muted-foreground"
                : "font-semibold text-foreground",
            )}
          >
            {email.from.name || email.from.address}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {formatEmailDate(email.date)}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className={cn(
              "text-[13px] truncate flex-1",
              email.isRead ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {email.subject}
          </span>
          {email.aiPriority === "high" && (
            <Badge
              variant="destructive"
              className="text-[9px] px-1 py-0 h-3.5 shrink-0"
            >
              urgent
            </Badge>
          )}
          {email.hasAttachments && (
            <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
        </div>
        <p className="text-[12px] text-muted-foreground truncate mt-0.5">
          {email.preview}
        </p>
      </div>
    </div>
  );
}

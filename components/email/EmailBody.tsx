"use client";
import { useState, useEffect } from "react";
import {
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Trash2,
  MoreHorizontal,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SummaryCard } from "@/components/ai/SummaryCard";
import { ActionSuggestions } from "@/components/ai/ActionSuggestions";
import { AttachmentList } from "./AttachmentList";
import { ThreadView } from "./ThreadView";
import { cn, getInitials } from "@/lib/utils";
import { format } from "date-fns";
import { useComposeStore } from "@/lib/stores/useComposeStore";
import { useEmailStore } from "@/lib/stores/useEmailStore";
import type { Email } from "@/lib/types";

interface EmailBodyProps {
  email: Email;
  thread?: Email[];
}

function reSubject(subject: string) {
  return subject.startsWith("Re: ") ? subject : `Re: ${subject}`;
}

function fwdSubject(subject: string) {
  return subject.startsWith("Fwd: ") ? subject : `Fwd: ${subject}`;
}

function buildForwardBody(email: Email): string {
  const from = email.from.name
    ? `${email.from.name} <${email.from.address}>`
    : email.from.address;
  const to = email.to
    .map((t) => (t.name ? `${t.name} <${t.address}>` : t.address))
    .join(", ");
  return `<br><br><div style="border-left:2px solid #6366f1;padding-left:12px;color:#9ca3af">
<p><b>---------- Forwarded message ----------</b><br>
From: ${from}<br>
Date: ${format(new Date(email.date), "MMM d, yyyy 'at' h:mm a")}<br>
Subject: ${email.subject}<br>
To: ${to}</p>
${email.body}
</div>`;
}

async function patchEmail(id: string, patch: Record<string, unknown>) {
  await fetch(`/api/emails/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function EmailBody({ email, thread = [] }: EmailBodyProps) {
  const [showImages, setShowImages] = useState(false);
  const { openCompose } = useComposeStore();
  const { markRead, markStarred, removeEmail, setEmails, emails, accounts } =
    useEmailStore();

  // Auto-mark as read when the email is opened
  useEffect(() => {
    if (!email.isRead) {
      void patchEmail(email.id, { isRead: true });
      markRead(email.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email.id]);

  const myAddresses = new Set(
    accounts.map((a) => a.email?.toLowerCase()).filter(Boolean),
  );

  const handleReply = () =>
    openCompose({
      to: [email.from],
      subject: reSubject(email.subject),
      inReplyToId: email.id,
      isReply: true,
    });

  const handleReplyAll = () => {
    const otherRecipients = email.to.filter(
      (t) => !myAddresses.has(t.address.toLowerCase()),
    );
    const otherCc = (email.cc ?? []).filter(
      (t) => !myAddresses.has(t.address.toLowerCase()),
    );
    openCompose({
      to: [email.from, ...otherRecipients],
      cc: otherCc,
      subject: reSubject(email.subject),
      inReplyToId: email.id,
      isReply: true,
    });
  };

  const handleForward = () =>
    openCompose({
      subject: fwdSubject(email.subject),
      body: buildForwardBody(email),
      isForward: true,
    });

  const handleArchive = async () => {
    await patchEmail(email.id, { archived: true });
    removeEmail(email.id);
  };

  const handleTrash = async () => {
    await patchEmail(email.id, { trashed: true });
    removeEmail(email.id);
  };

  const handleMarkUnread = async () => {
    await patchEmail(email.id, { isRead: false });
    setEmails(
      emails.map((e) => (e.id === email.id ? { ...e, isRead: false } : e)),
    );
  };

  const handleToggleStar = async () => {
    const next = !email.isStarred;
    await patchEmail(email.id, { isStarred: next });
    markStarred(email.id, next);
  };

  const processedBody = showImages
    ? email.body
    : email.body.replace(
        /src="(https?:\/\/[^"]+)"/g,
        'data-blocked-src="$1" src=""',
      );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {/* Subject */}
      <h1 className="text-xl font-semibold text-foreground">{email.subject}</h1>

      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className="bg-secondary text-sm">
            {getInitials(email.from.name || email.from.address)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-medium text-sm">{email.from.name}</span>
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                &lt;{email.from.address}&gt;
              </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {format(new Date(email.date), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            To: {email.to.map((t) => t.name || t.address).join(", ")}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={handleReply}
        >
          <Reply className="w-4 h-4" /> Reply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={handleReplyAll}
        >
          <ReplyAll className="w-4 h-4" /> Reply All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={handleForward}
        >
          <Forward className="w-4 h-4" /> Forward
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => void handleArchive()}
          title="Archive"
        >
          <Archive className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => void handleTrash()}
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("w-8 h-8", email.isStarred && "text-yellow-400")}
          onClick={() => void handleToggleStar()}
          title={email.isStarred ? "Unstar" : "Star"}
        >
          <Star className={cn("w-4 h-4", email.isStarred && "fill-current")} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void handleMarkUnread()}>
              Mark as unread
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}>
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* AI Summary */}
      <SummaryCard email={email} />

      {/* External images banner */}
      {!showImages && /src="https?:\/\//.test(email.body) ? (
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 border border-border text-xs">
          <span className="text-muted-foreground">
            External images are blocked
          </span>
          <button
            onClick={() => setShowImages(true)}
            className="text-primary hover:underline"
          >
            Load images
          </button>
        </div>
      ) : null}

      {/* Email body */}
      <div className="prose prose-invert prose-sm max-w-none">
        {email.body ? (
          <iframe
            sandbox="allow-same-origin"
            srcDoc={`<!doctype html><html><head><style>
              body { font-family: system-ui, sans-serif; color: #e5e7eb; background: transparent; margin: 0; padding: 0; font-size: 14px; line-height: 1.6; }
              a { color: #6366f1; }
              pre, code { background: #1f2937; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
              img[data-blocked-src] { display: none; }
            </style></head><body>${processedBody}</body></html>`}
            className="w-full border-none min-h-[200px]"
            onLoad={(e) => {
              const iframe = e.currentTarget;
              if (iframe.contentDocument?.body) {
                iframe.style.height =
                  iframe.contentDocument.body.scrollHeight + "px";
              }
            }}
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm font-sans">
            {email.preview}
          </pre>
        )}
      </div>

      {/* Attachments */}
      {email.hasAttachments && <AttachmentList attachments={[]} />}

      {/* Action suggestions */}
      <ActionSuggestions email={email} />

      {/* Thread */}
      {thread.length > 1 && (
        <ThreadView emails={thread} mainEmailId={email.id} />
      )}
    </div>
  );
}

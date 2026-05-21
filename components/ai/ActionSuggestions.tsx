"use client";
import useSWR from "swr";
import { useComposeStore } from "@/lib/stores/useComposeStore";
import { useEmailStore } from "@/lib/stores/useEmailStore";
import type { Email } from "@/lib/types";

interface ActionSuggestionsProps {
  email: Email;
}

const fetcher = (url: string, init: RequestInit) =>
  fetch(url, init).then((r) => r.json());

async function patchEmail(id: string, patch: Record<string, unknown>) {
  await fetch(`/api/emails/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

function reSubject(s: string) {
  return s.startsWith("Re: ") ? s : `Re: ${s}`;
}

/** Returns the handler for a given AI-suggested action label. */
function useActionHandler(
  email: Email,
  action: string,
): (() => void) | (() => Promise<void>) {
  const { openCompose } = useComposeStore();
  const { markRead, removeEmail } = useEmailStore();
  const lower = action.toLowerCase();

  if (/archive/.test(lower)) {
    return async () => {
      await patchEmail(email.id, { archived: true });
      removeEmail(email.id);
    };
  }
  if (/trash|delete/.test(lower)) {
    return async () => {
      await patchEmail(email.id, { trashed: true });
      removeEmail(email.id);
    };
  }
  if (/mark.*(read|unread)/.test(lower)) {
    const markAsUnread = /unread/.test(lower);
    return async () => {
      await patchEmail(email.id, { isRead: !markAsUnread });
      if (!markAsUnread) markRead(email.id);
    };
  }

  // Default: open compose (reply, respond, schedule meeting, etc.)
  return () =>
    openCompose({
      to: [email.from],
      subject: reSubject(email.subject),
      inReplyToId: email.id,
      isReply: true,
    });
}

function ActionButton({ email, action }: { email: Email; action: string }) {
  const handler = useActionHandler(email, action);
  return (
    <button
      onClick={() => void handler()}
      className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
      title={action}
    >
      {action}
    </button>
  );
}

export function ActionSuggestions({ email }: ActionSuggestionsProps) {
  const { data } = useSWR(
    `/api/ai/suggest-actions`,
    (url) =>
      fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id }),
      }),
    { revalidateOnFocus: false },
  );

  const actions: string[] = data?.actions ?? [];
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {actions.map((action, i) => (
        <ActionButton key={i} email={email} action={action} />
      ))}
    </div>
  );
}

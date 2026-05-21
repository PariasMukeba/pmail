/**
 * POST /api/sync/[accountId] — sync one account, streaming progress as SSE.
 *
 * Event shapes:
 *   { type: "email",  count: number }
 *   { type: "error",  error: string }
 *   { type: "done",   synced: number, errors: string[] }
 */

import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { getProviderAdapter } from "@/lib/sync";
import { SyncError, NotFoundError } from "@/lib/errors";
import { MAX_EMAILS_PER_SYNC } from "@/lib/constants";
import type { EmailData } from "@/lib/sync/types";

/** Allow up to 60 seconds for this streaming route. */
export const maxDuration = 60;

interface RouteParams {
  params: { accountId: string };
}

function sseFrame(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

async function writeEmail(
  accountId: string,
  email: EmailData,
): Promise<string | null> {
  const { error } = await supabase.from("CachedEmail").upsert(
    {
      accountId,
      messageId: email.messageId,
      threadId: email.threadId,
      subject: email.subject,
      fromName: email.fromName,
      fromAddress: email.fromAddress,
      toAddresses: email.toAddresses,
      ccAddresses: email.ccAddresses,
      preview: email.preview,
      bodyText: email.bodyText ?? null,
      bodyHtml: email.bodyHtml ?? null,
      rawMime: email.rawMime ?? null,
      date: email.date instanceof Date ? email.date.toISOString() : email.date,
      isRead: email.isRead,
      isStarred: email.isStarred,
      isDraft: email.isDraft,
      labels: email.labels,
      hasAttachments: email.hasAttachments,
      inReplyTo: email.inReplyTo ?? null,
      references: email.references ?? null,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "accountId,messageId" },
  );
  return error ? error.message : null;
}

/**
 * POST /api/sync/[accountId]
 * Streams SSE events as emails are written newest-first.
 */
export async function POST(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: accountRow } = await supabase
    .from("Account")
    .select("*")
    .eq("id", params.accountId)
    .eq("userId", session.user.id)
    .single();

  if (!accountRow) {
    const err = new NotFoundError("Account", params.accountId);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const account = accountRow as Record<string, unknown>;

  let adapter;
  try {
    adapter = await getProviderAdapter(account.provider as string);
  } catch {
    const syncErr = new SyncError(
      account.id as string,
      account.provider as string,
      `Unsupported provider: ${account.provider}`,
    );
    return new Response(JSON.stringify({ error: syncErr.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: syncStateRow } = await supabase
    .from("SyncState")
    .select("*")
    .eq("accountId", params.accountId)
    .single();
  const ss = syncStateRow as Record<string, unknown> | null;

  const stream = new ReadableStream({
    async start(controller) {
      let synced = 0;
      const errors: string[] = [];

      try {
        const result = await adapter.fetchEmails(account.id as string, {
          incremental: !!(ss?.historyId || ss?.deltaLink),
          maxResults: MAX_EMAILS_PER_SYNC,
          pageToken: (ss?.nextPageToken as string) ?? undefined,
        });

        // Sort newest-first before writing so the inbox fills top-down
        const sorted = [...result.emails].sort((a, b) => {
          const ta =
            a.date instanceof Date
              ? a.date.getTime()
              : new Date(a.date as string).getTime();
          const tb =
            b.date instanceof Date
              ? b.date.getTime()
              : new Date(b.date as string).getTime();
          return tb - ta;
        });

        for (const email of sorted) {
          const writeErr = await writeEmail(account.id as string, email);
          if (writeErr) {
            errors.push(writeErr);
            controller.enqueue(sseFrame({ type: "error", error: writeErr }));
          } else {
            synced++;
            controller.enqueue(sseFrame({ type: "email", count: synced }));
          }
        }

        const { error: ssErr } = await supabase.from("SyncState").upsert(
          {
            accountId: account.id,
            lastSyncedAt: new Date().toISOString(),
            nextPageToken: result.nextPageToken ?? null,
            historyId: result.historyId ?? ss?.historyId ?? null,
            deltaLink: result.deltaLink ?? ss?.deltaLink ?? null,
            updatedAt: new Date().toISOString(),
          },
          { onConflict: "accountId" },
        );
        if (ssErr) errors.push(`SyncState: ${ssErr.message}`);
      } catch (err) {
        const msg = err instanceof SyncError ? err.message : String(err);
        errors.push(msg);
        controller.enqueue(sseFrame({ type: "error", error: msg }));
      }

      controller.enqueue(sseFrame({ type: "done", synced, errors }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

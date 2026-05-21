/**
 * POST /api/sync/all — sync all connected accounts, streaming progress as SSE.
 *
 * Emits one `email` event per email written to the DB (sorted newest-first),
 * so the inbox can update progressively. Ends with a `done` event.
 *
 * Event shapes:
 *   { type: "email",  count: number, accountId: string }
 *   { type: "error",  error: string, accountId: string }
 *   { type: "done",   synced: number, errors: string[] }
 */

import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { getProviderAdapter } from "@/lib/sync";
import { SyncError } from "@/lib/errors";
import { MAX_EMAILS_PER_SYNC } from "@/lib/constants";
import type { EmailData } from "@/lib/sync/types";

/** Allow up to 60 seconds for this streaming route. */
export const maxDuration = 60;

/** Encode a single SSE frame. */
function sseFrame(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

/** Upsert one email into CachedEmail. Returns an error string on failure. */
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
 * POST /api/sync/all
 * Returns a Server-Sent Event stream. Emails are written newest-first so the
 * inbox fills up in reverse chronological order from the first event.
 */
export async function POST(_request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;

  // Load accounts + existing sync states before opening the stream
  const { data: accountRows } = await supabase
    .from("Account")
    .select("*")
    .eq("userId", userId)
    .eq("isActive", true);

  const accounts = (accountRows ?? []) as Record<string, unknown>[];
  if (accounts.length === 0) {
    return new Response(
      `data: ${JSON.stringify({ type: "done", synced: 0, errors: [] })}\n\n`,
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      },
    );
  }

  const accountIds = accounts.map((a) => a.id as string);
  const { data: syncStateRows } = await supabase
    .from("SyncState")
    .select("*")
    .in("accountId", accountIds);

  const syncStateMap = Object.fromEntries(
    (syncStateRows ?? []).map((s: Record<string, unknown>) => [
      s.accountId as string,
      s,
    ]),
  );

  const stream = new ReadableStream({
    async start(controller) {
      let totalSynced = 0;
      const errors: string[] = [];

      for (const account of accounts) {
        const ss = syncStateMap[account.id as string] as
          | Record<string, unknown>
          | undefined;

        try {
          const adapter = await getProviderAdapter(account.provider as string);

          const result = await adapter.fetchEmails(account.id as string, {
            incremental: !!(ss?.historyId || ss?.deltaLink),
            maxResults: MAX_EMAILS_PER_SYNC,
            pageToken: (ss?.nextPageToken as string) ?? undefined,
          });

          // Sort newest-first so the inbox fills top-down as events arrive
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
              controller.enqueue(
                sseFrame({
                  type: "error",
                  error: writeErr,
                  accountId: account.id,
                }),
              );
            } else {
              totalSynced++;
              controller.enqueue(
                sseFrame({
                  type: "email",
                  count: totalSynced,
                  accountId: account.id,
                }),
              );
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
          if (ssErr) {
            errors.push(`SyncState: ${ssErr.message}`);
          }
        } catch (err) {
          const msg = err instanceof SyncError ? err.message : String(err);
          errors.push(msg);
          controller.enqueue(
            sseFrame({ type: "error", error: msg, accountId: account.id }),
          );
        }
      }

      controller.enqueue(
        sseFrame({ type: "done", synced: totalSynced, errors }),
      );
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

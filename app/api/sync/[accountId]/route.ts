/**
 * POST /api/sync/[accountId] — trigger sync for one account.
 *
 * Fetches new emails from the provider, upserts them into `CachedEmail`,
 * and updates the `SyncState` row for the account.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderAdapter } from "@/lib/sync";
import { SyncError, NotFoundError } from "@/lib/errors";
import { MAX_EMAILS_PER_SYNC } from "@/lib/constants";

/** Allow up to 60 seconds for this route (Vercel Edge / serverless limit). */
export const maxDuration = 60;

interface RouteParams {
  params: { accountId: string };
}

/**
 * POST /api/sync/[accountId]
 * Triggers an incremental (or full) sync for the given account.
 */
export async function POST(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { id: params.accountId, userId: session.user.id },
    include: { syncState: true },
  });

  if (!account) {
    const err = new NotFoundError("Account", params.accountId);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  let adapter;
  try {
    adapter = await getProviderAdapter(account.provider);
  } catch (err) {
    const syncErr = new SyncError(
      account.id,
      account.provider,
      `Unsupported provider: ${account.provider}`,
    );
    return NextResponse.json({ error: syncErr.message }, { status: 400 });
  }

  let synced = 0;

  try {
    const result = await adapter.fetchEmails(account.id, {
      incremental: !!account.syncState?.historyId || !!account.syncState?.deltaLink,
      maxResults: MAX_EMAILS_PER_SYNC,
      pageToken: account.syncState?.nextPageToken ?? undefined,
    });

    // Upsert each email row
    for (const email of result.emails) {
      await prisma.cachedEmail.upsert({
        where: { accountId_messageId: { accountId: account.id, messageId: email.messageId } },
        create: {
          accountId: account.id,
          messageId: email.messageId,
          threadId: email.threadId,
          subject: email.subject,
          fromName: email.fromName,
          fromAddress: email.fromAddress,
          toAddresses: email.toAddresses,
          ccAddresses: email.ccAddresses,
          preview: email.preview,
          bodyText: email.bodyText,
          bodyHtml: email.bodyHtml,
          rawMime: email.rawMime,
          date: email.date,
          isRead: email.isRead,
          isStarred: email.isStarred,
          isDraft: email.isDraft,
          labels: email.labels,
          hasAttachments: email.hasAttachments,
          inReplyTo: email.inReplyTo,
          references: email.references,
        },
        update: {
          isRead: email.isRead,
          isStarred: email.isStarred,
          labels: email.labels,
        },
      });
      synced++;
    }

    // Update sync state
    await prisma.syncState.upsert({
      where: { accountId: account.id },
      create: {
        accountId: account.id,
        lastSyncedAt: new Date(),
        nextPageToken: result.nextPageToken ?? null,
        historyId: result.historyId ?? null,
        deltaLink: result.deltaLink ?? null,
      },
      update: {
        lastSyncedAt: new Date(),
        nextPageToken: result.nextPageToken ?? null,
        ...(result.historyId && { historyId: result.historyId }),
        ...(result.deltaLink && { deltaLink: result.deltaLink }),
      },
    });
  } catch (err) {
    const syncErr =
      err instanceof SyncError
        ? err
        : new SyncError(account.id, account.provider, String(err));
    return NextResponse.json({ error: syncErr.message }, { status: 500 });
  }

  return NextResponse.json({ synced });
}

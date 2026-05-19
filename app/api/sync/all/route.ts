/**
 * POST /api/sync/all — sync all connected accounts for the current user.
 *
 * Runs each account's sync in parallel and returns an aggregated result.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderAdapter } from "@/lib/sync";
import { SyncError } from "@/lib/errors";
import { MAX_EMAILS_PER_SYNC } from "@/lib/constants";

/** Allow up to 60 seconds for this route. */
export const maxDuration = 60;

interface AccountSyncResult {
  accountId: string;
  synced: number;
  error?: string;
}

/**
 * POST /api/sync/all
 * Syncs all accounts belonging to the authenticated user in parallel.
 */
export async function POST(_request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { syncState: true },
  });

  const results = await Promise.all(
    accounts.map(async (account): Promise<AccountSyncResult> => {
      try {
        const adapter = await getProviderAdapter(account.provider);

        const result = await adapter.fetchEmails(account.id, {
          incremental:
            !!account.syncState?.historyId ||
            !!account.syncState?.deltaLink,
          maxResults: MAX_EMAILS_PER_SYNC,
          pageToken: account.syncState?.nextPageToken ?? undefined,
        });

        let synced = 0;
        for (const email of result.emails) {
          await prisma.cachedEmail.upsert({
            where: {
              accountId_messageId: {
                accountId: account.id,
                messageId: email.messageId,
              },
            },
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

        return { accountId: account.id, synced };
      } catch (err) {
        const syncErr =
          err instanceof SyncError
            ? err
            : new SyncError(account.id, account.provider, String(err));
        return { accountId: account.id, synced: 0, error: syncErr.message };
      }
    }),
  );

  return NextResponse.json({ results });
}

/**
 * GET /api/debug — temporary diagnostic route.
 * Returns sync status without any email content.
 * Delete this file after diagnosing the sync issue.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderAdapter } from "@/lib/sync";
import { MAX_EMAILS_PER_SYNC } from "@/lib/constants";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    include: { syncState: true },
    select: {
      id: true,
      provider: true,
      isActive: true,
      email: true,
      syncState: true,
      access_token: false,
      refresh_token: false,
      expires_at: true,
    },
  });

  const emailCount = await prisma.cachedEmail.count({
    where: { account: { userId: session.user.id } },
  });

  const syncResults = await Promise.all(
    accounts.map(async (account) => {
      try {
        const adapter = await getProviderAdapter(account.provider);
        const result = await adapter.fetchEmails(account.id, {
          incremental: false,
          maxResults: 5,
        });
        return {
          accountId: account.id,
          provider: account.provider,
          isActive: account.isActive,
          emailsFetched: result.emails.length,
          nextPageToken: result.nextPageToken,
          historyId: result.historyId,
          error: null,
        };
      } catch (err) {
        return {
          accountId: account.id,
          provider: account.provider,
          isActive: account.isActive,
          emailsFetched: 0,
          error: String(err),
        };
      }
    }),
  );

  return NextResponse.json({
    userId: session.user.id,
    cachedEmailCount: emailCount,
    accounts: accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      isActive: a.isActive,
      email: a.email,
      expiresAt: a.expires_at,
      hasSyncState: !!a.syncState,
    })),
    syncResults,
  });
}

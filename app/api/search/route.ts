/**
 * GET /api/search — full-text email search.
 *
 * Query params:
 *   q              – search query (required)
 *   accountId      – restrict to one account (optional)
 *   label          – restrict to label name (optional)
 *   dateFrom       – ISO date string (optional)
 *   dateTo         – ISO date string (optional)
 *   hasAttachments – "true" (optional)
 *   isRead         – "true" | "false" (optional)
 *   cursor         – pagination cursor (optional)
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dbEmailToApiEmail } from "@/lib/inbox";
import { SEARCH_MAX_RESULTS } from "@/lib/constants";

const PAGE_SIZE = SEARCH_MAX_RESULTS;

/**
 * GET /api/search
 * Searches email subject, sender name, sender address, and preview text
 * using Prisma `contains` queries.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q");
  if (!q?.trim()) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 },
    );
  }

  const accountId = searchParams.get("accountId") ?? undefined;
  const label = searchParams.get("label") ?? undefined;
  const dateFromRaw = searchParams.get("dateFrom");
  const dateToRaw = searchParams.get("dateTo");
  const hasAttachments =
    searchParams.get("hasAttachments") === "true" ? true : undefined;
  const isReadRaw = searchParams.get("isRead");
  const isRead =
    isReadRaw === "true" ? true : isReadRaw === "false" ? false : undefined;
  const cursor = searchParams.get("cursor") ?? undefined;

  const dateFrom = dateFromRaw ? new Date(dateFromRaw) : undefined;
  const dateTo = dateToRaw ? new Date(dateToRaw) : undefined;

  // Resolve account IDs to enforce userId ownership
  let accountIds: string[];
  if (accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.user.id },
      select: { id: true },
    });
    if (!account) {
      return NextResponse.json({ emails: [] });
    }
    accountIds = [account.id];
  } else {
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    accountIds = accounts.map((a) => a.id);
  }

  if (accountIds.length === 0) {
    return NextResponse.json({ emails: [] });
  }

  const rows = await prisma.cachedEmail.findMany({
    where: {
      accountId: { in: accountIds },
      isDraft: false,
      ...(isRead !== undefined && { isRead }),
      ...(hasAttachments !== undefined && { hasAttachments }),
      ...(label && { labels: { contains: label } }),
      ...(dateFrom && { date: { gte: dateFrom } }),
      ...(dateTo && {
        date: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          lte: dateTo,
        },
      }),
      OR: [
        { subject: { contains: q } },
        { fromName: { contains: q } },
        { fromAddress: { contains: q } },
        { preview: { contains: q } },
      ],
    },
    orderBy: { date: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = rows.length > PAGE_SIZE;
  const slice = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return NextResponse.json({
    emails: slice.map(dbEmailToApiEmail),
    nextCursor: hasMore ? slice[slice.length - 1]?.id : undefined,
  });
}

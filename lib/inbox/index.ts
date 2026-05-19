/**
 * Inbox query utilities — shared between API routes that list emails.
 *
 * `queryInbox` translates URL query params into a Prisma query and returns a
 * paginated slice of `CachedEmail` rows.  `dbEmailToApiEmail` converts a
 * raw Prisma row into the public `Email` type consumed by the UI.
 */

import { prisma } from "@/lib/prisma";
import type { Email, EmailAddress } from "@/lib/types";
import type { CachedEmail } from "@prisma/client";

/** Parameters accepted by `queryInbox`. */
export interface InboxQuery {
  /** Filter to a single connected account. */
  accountId?: string;
  /** Filter by label name. */
  label?: string;
  /** Opaque pagination cursor (the last email's `id`). */
  cursor?: string;
  /** Maximum number of emails to return. Capped at 100. */
  limit?: number;
  /** If true, only return unread emails. */
  unread?: boolean;
  /** If true, only return starred emails. */
  starred?: boolean;
  /** If true, only return emails with attachments. */
  hasAttachments?: boolean;
  /** Restrict results to this user's accounts. */
  userId: string;
}

/** Shape returned by `queryInbox`. */
export interface InboxResult {
  emails: Email[];
  nextCursor?: string;
}

const MAX_PAGE_SIZE = 100;

/**
 * Queries `CachedEmail` with optional filters and cursor-based pagination.
 *
 * The `userId` parameter is always enforced — rows from other users are never
 * returned regardless of the other filter values.
 */
export async function queryInbox(query: InboxQuery): Promise<InboxResult> {
  const take = Math.min(query.limit ?? 50, MAX_PAGE_SIZE);

  // Resolve accountId filter — must belong to userId
  let accountIdFilter: string | undefined = query.accountId;
  if (!accountIdFilter) {
    const accounts = await prisma.account.findMany({
      where: { userId: query.userId },
      select: { id: true },
    });
    const ids = accounts.map((a) => a.id);
    if (ids.length === 0) {
      return { emails: [] };
    }
    // We'll use an array filter below
    const rows = await prisma.cachedEmail.findMany({
      where: {
        accountId: { in: ids },
        ...(query.unread !== undefined && { isRead: !query.unread }),
        ...(query.starred !== undefined && { isStarred: query.starred }),
        ...(query.hasAttachments !== undefined && {
          hasAttachments: query.hasAttachments,
        }),
        ...(query.label && {
          labels: { contains: query.label },
        }),
        isDraft: false,
      },
      orderBy: { date: "desc" },
      take: take + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    });

    const hasMore = rows.length > take;
    const slice = hasMore ? rows.slice(0, take) : rows;
    return {
      emails: slice.map(dbEmailToApiEmail),
      nextCursor: hasMore ? slice[slice.length - 1]?.id : undefined,
    };
  }

  const rows = await prisma.cachedEmail.findMany({
    where: {
      accountId: accountIdFilter,
      account: { userId: query.userId },
      ...(query.unread !== undefined && { isRead: !query.unread }),
      ...(query.starred !== undefined && { isStarred: query.starred }),
      ...(query.hasAttachments !== undefined && {
        hasAttachments: query.hasAttachments,
      }),
      ...(query.label && {
        labels: { contains: query.label },
      }),
      isDraft: false,
    },
    orderBy: { date: "desc" },
    take: take + 1,
    ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
  });

  const hasMore = rows.length > take;
  const slice = hasMore ? rows.slice(0, take) : rows;
  return {
    emails: slice.map(dbEmailToApiEmail),
    nextCursor: hasMore ? slice[slice.length - 1]?.id : undefined,
  };
}

/**
 * Converts a `CachedEmail` Prisma row to the public `Email` API type.
 *
 * JSON string fields (`toAddresses`, `ccAddresses`, `labels`) are parsed
 * with a safe fallback to an empty array.
 */
export function dbEmailToApiEmail(row: CachedEmail): Email {
  function safeParseArray<T>(json: string): T[] {
    try {
      const parsed: unknown = JSON.parse(json);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  const priority = row.aiPriority as "high" | "normal" | "low";

  return {
    id: row.id,
    threadId: row.threadId,
    accountId: row.accountId,
    from: { name: row.fromName, address: row.fromAddress },
    to: safeParseArray<EmailAddress>(row.toAddresses),
    cc: safeParseArray<EmailAddress>(row.ccAddresses),
    subject: row.subject,
    preview: row.preview,
    body: row.bodyHtml ?? row.bodyText ?? "",
    date: row.date,
    isRead: row.isRead,
    isStarred: row.isStarred,
    labels: safeParseArray<string>(row.labels),
    hasAttachments: row.hasAttachments,
    aiPriority: priority === "high" || priority === "low" ? priority : "normal",
    aiSummary: row.aiSummary ?? null,
    isDraft: row.isDraft,
  };
}

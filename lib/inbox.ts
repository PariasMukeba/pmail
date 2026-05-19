import { prisma } from "@/lib/prisma";
import type { Email, PaginatedResult } from "@/lib/types";

/** Query parameters for fetching inbox emails */
export interface InboxQuery {
  userId: string;
  accountId?: string | "unified";
  label?: string;
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
  starredOnly?: boolean;
  hasAttachments?: boolean;
  draftsOnly?: boolean;
  priorityOnly?: boolean;
  search?: string;
}

/**
 * Converts a CachedEmail database row into the Email API shape.
 * Parses JSON-encoded address arrays and normalises the priority field.
 */
export function dbEmailToApiEmail(row: {
  id: string;
  threadId: string;
  accountId: string;
  fromName: string;
  fromAddress: string;
  toAddresses: string;
  ccAddresses: string;
  subject: string;
  preview: string;
  bodyHtml: string | null;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  labels: string;
  hasAttachments: boolean;
  aiPriority: string;
  aiSummary: string | null;
}): Email {
  const parsedTo = JSON.parse(row.toAddresses) as Array<{
    name: string;
    address: string;
  }>;
  const parsedCc = JSON.parse(row.ccAddresses) as Array<{
    name: string;
    address: string;
  }>;
  const parsedLabels = JSON.parse(row.labels) as string[];

  const priorityMap: Record<string, "high" | "normal" | "low"> = {
    high: "high",
    normal: "normal",
    low: "low",
  };

  return {
    id: row.id,
    threadId: row.threadId,
    accountId: row.accountId,
    from: { name: row.fromName, address: row.fromAddress },
    to: parsedTo,
    cc: parsedCc.length > 0 ? parsedCc : undefined,
    subject: row.subject,
    preview: row.preview,
    body: row.bodyHtml ?? "",
    date: row.date,
    isRead: row.isRead,
    isStarred: row.isStarred,
    isDraft: row.isDraft,
    labels: parsedLabels,
    hasAttachments: row.hasAttachments,
    aiPriority: priorityMap[row.aiPriority] ?? "normal",
    aiSummary: row.aiSummary,
  };
}

/**
 * Fetches a paginated list of emails from the database for a given user,
 * applying optional filters for account, label, read state, and full-text search.
 */
export async function queryInbox(
  query: InboxQuery
): Promise<PaginatedResult<Email>> {
  const {
    userId,
    accountId,
    label,
    cursor,
    limit = 50,
    unreadOnly,
    starredOnly,
    hasAttachments,
    draftsOnly,
    priorityOnly,
    search,
  } = query;

  const pageSize = Math.min(limit, 200);

  // Build dynamic where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    account: { userId },
  };

  if (accountId && accountId !== "unified") {
    where.accountId = accountId;
  }

  if (label) {
    // labels is stored as a JSON array string; use string-contains as a
    // pragmatic filter — for production use a proper DB array column.
    where.labels = { contains: JSON.stringify(label) };
  }

  if (unreadOnly) {
    where.isRead = false;
  }

  if (starredOnly) {
    where.isStarred = true;
  }

  if (hasAttachments) {
    where.hasAttachments = true;
  }

  if (draftsOnly) {
    where.isDraft = true;
  }

  if (priorityOnly) {
    where.aiPriority = "high";
  }

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { preview: { contains: search, mode: "insensitive" } },
      { fromAddress: { contains: search, mode: "insensitive" } },
      { fromName: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.cachedEmail.findMany({
    where,
    orderBy: { date: "desc" },
    take: pageSize + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : undefined;

  return {
    items: items.map((row) => dbEmailToApiEmail(row)),
    nextCursor,
  };
}

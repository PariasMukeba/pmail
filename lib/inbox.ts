import { supabase } from "@/lib/supabase";
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

interface DbEmail {
  id: string;
  threadId: string;
  accountId: string;
  messageId: string;
  fromName: string;
  fromAddress: string;
  toAddresses: string;
  ccAddresses: string;
  subject: string;
  preview: string;
  bodyText: string | null;
  bodyHtml: string | null;
  date: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  labels: string;
  hasAttachments: boolean;
  aiPriority: string;
  aiSummary: string | null;
}

/**
 * Converts a CachedEmail database row into the Email API shape.
 * Parses JSON-encoded address arrays and normalises the priority field.
 */
export function dbEmailToApiEmail(row: Record<string, unknown>): Email {
  function safeParseArray<T>(json: string): T[] {
    try {
      const parsed: unknown = JSON.parse(json);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  const priorityMap: Record<string, "high" | "normal" | "low"> = {
    high: "high",
    normal: "normal",
    low: "low",
  };

  return {
    id: row.id as string,
    threadId: row.threadId as string,
    accountId: row.accountId as string,
    from: { name: row.fromName as string, address: row.fromAddress as string },
    to: safeParseArray(row.toAddresses as string),
    cc: safeParseArray(row.ccAddresses as string),
    subject: row.subject as string,
    preview: row.preview as string,
    body:
      (row.bodyHtml as string | null) ?? (row.bodyText as string | null) ?? "",
    date: new Date(row.date as string),
    isRead: row.isRead as boolean,
    isStarred: row.isStarred as boolean,
    isDraft: row.isDraft as boolean,
    labels: safeParseArray<string>(row.labels as string),
    hasAttachments: row.hasAttachments as boolean,
    aiPriority: priorityMap[row.aiPriority as string] ?? "normal",
    aiSummary: (row.aiSummary as string | null) ?? null,
  };
}

/**
 * Fetches a paginated list of emails from the database for a given user,
 * applying optional filters for account, label, read state, and full-text search.
 */
export async function queryInbox(
  query: InboxQuery,
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

  // Resolve account IDs for this user
  let accountIds: string[];
  if (accountId && accountId !== "unified") {
    accountIds = [accountId];
  } else {
    const { data: accounts } = await supabase
      .from("Account")
      .select("id")
      .eq("userId", userId);
    accountIds = (accounts ?? []).map(
      (a: Record<string, unknown>) => a.id as string,
    );
  }

  if (accountIds.length === 0) {
    return { items: [] };
  }

  let q = supabase
    .from("CachedEmail")
    .select("*")
    .in("accountId", accountIds)
    .order("date", { ascending: false })
    .limit(pageSize + 1);

  if (cursor) {
    q = q.lt("date", cursor);
  }

  if (unreadOnly) q = q.eq("isRead", false);
  if (starredOnly) q = q.eq("isStarred", true);
  if (hasAttachments) q = q.eq("hasAttachments", true);
  if (draftsOnly) q = q.eq("isDraft", true);
  if (priorityOnly) q = q.eq("aiPriority", "high");

  if (label) {
    q = q.like("labels", `%"${label}"%`);
  }

  if (search) {
    const s = search.replace(/[%_]/g, "\\$&");
    q = q.or(
      `subject.ilike.%${s}%,preview.ilike.%${s}%,fromAddress.ilike.%${s}%,fromName.ilike.%${s}%`,
    );
  }

  const { data: rows } = await q;
  const items = (rows ?? []) as Record<string, unknown>[];

  const hasMore = items.length > pageSize;
  const slice = hasMore ? items.slice(0, pageSize) : items;
  const nextCursor = hasMore
    ? (slice[slice.length - 1]?.date as string | undefined)
    : undefined;

  return {
    items: slice.map(dbEmailToApiEmail),
    nextCursor,
  };
}

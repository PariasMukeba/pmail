/**
 * Inbox query utilities — shared between API routes that list emails.
 *
 * `queryInbox` translates URL query params into a Supabase query and returns a
 * paginated slice of `CachedEmail` rows.  `dbEmailToApiEmail` converts a
 * raw DB row into the public `Email` type consumed by the UI.
 */

import { supabase } from "@/lib/supabase";
import type { Email, EmailAddress } from "@/lib/types";

interface DbCachedEmail {
  id: string;
  threadId: string;
  accountId: string;
  messageId: string;
  subject: string;
  fromName: string;
  fromAddress: string;
  toAddresses: string;
  ccAddresses: string;
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

/** Parameters accepted by `queryInbox`. */
export interface InboxQuery {
  /** Filter to a single connected account. */
  accountId?: string;
  /** Filter by label name. */
  label?: string;
  /** Opaque pagination cursor (ISO date string of the last email). */
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

  // Resolve account IDs for this user
  let accountIds: string[];
  if (query.accountId) {
    const { data: acct } = await supabase
      .from("Account")
      .select("id")
      .eq("id", query.accountId)
      .eq("userId", query.userId)
      .single();
    if (!acct) return { emails: [] };
    accountIds = [(acct as Record<string, unknown>).id as string];
  } else {
    const { data: accounts } = await supabase
      .from("Account")
      .select("id")
      .eq("userId", query.userId);
    accountIds = (accounts ?? []).map(
      (a: Record<string, unknown>) => a.id as string,
    );
  }

  if (accountIds.length === 0) return { emails: [] };

  let q = supabase
    .from("CachedEmail")
    .select("*")
    .in("accountId", accountIds)
    .eq("isDraft", false)
    .order("date", { ascending: false })
    .limit(take + 1);

  if (query.cursor) q = q.lt("date", query.cursor);
  if (query.unread !== undefined) q = q.eq("isRead", !query.unread);
  if (query.starred !== undefined) q = q.eq("isStarred", query.starred);
  if (query.hasAttachments !== undefined)
    q = q.eq("hasAttachments", query.hasAttachments);
  if (query.label) q = q.like("labels", `%"${query.label}"%`);

  const { data: rows } = await q;
  const items = (rows ?? []) as DbCachedEmail[];

  const hasMore = items.length > take;
  const slice = hasMore ? items.slice(0, take) : items;
  return {
    emails: slice.map(dbEmailToApiEmail),
    nextCursor: hasMore ? slice[slice.length - 1]?.date : undefined,
  };
}

/**
 * Converts a `CachedEmail` DB row to the public `Email` API type.
 *
 * JSON string fields (`toAddresses`, `ccAddresses`, `labels`) are parsed
 * with a safe fallback to an empty array.
 */
export function dbEmailToApiEmail(row: DbCachedEmail): Email {
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
    date: new Date(row.date),
    isRead: row.isRead,
    isStarred: row.isStarred,
    labels: safeParseArray<string>(row.labels),
    hasAttachments: row.hasAttachments,
    aiPriority: priority === "high" || priority === "low" ? priority : "normal",
    aiSummary: row.aiSummary ?? null,
    isDraft: row.isDraft,
  };
}

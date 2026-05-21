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
import { supabase } from "@/lib/supabase";
import { dbEmailToApiEmail } from "@/lib/inbox";
import { SEARCH_MAX_RESULTS } from "@/lib/constants";

const PAGE_SIZE = SEARCH_MAX_RESULTS;

/**
 * GET /api/search
 * Searches email subject, sender name, sender address, and preview text.
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

  // Resolve account IDs to enforce userId ownership
  let accountIds: string[];
  if (accountId) {
    const { data: acct } = await supabase
      .from("Account")
      .select("id")
      .eq("id", accountId)
      .eq("userId", session.user.id)
      .single();
    if (!acct) return NextResponse.json({ emails: [] });
    accountIds = [(acct as Record<string, unknown>).id as string];
  } else {
    const { data: accounts } = await supabase
      .from("Account")
      .select("id")
      .eq("userId", session.user.id);
    accountIds = (accounts ?? []).map(
      (a: Record<string, unknown>) => a.id as string,
    );
  }

  if (accountIds.length === 0) return NextResponse.json({ emails: [] });

  const s = q.replace(/[%_]/g, "\\$&");

  let query = supabase
    .from("CachedEmail")
    .select("*")
    .in("accountId", accountIds)
    .eq("isDraft", false)
    .or(
      `subject.ilike.%${s}%,fromName.ilike.%${s}%,fromAddress.ilike.%${s}%,preview.ilike.%${s}%`,
    )
    .order("date", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.lt("date", cursor);
  if (isRead !== undefined) query = query.eq("isRead", isRead);
  if (hasAttachments !== undefined)
    query = query.eq("hasAttachments", hasAttachments);
  if (label) query = query.like("labels", `%"${label}"%`);
  if (dateFromRaw) query = query.gte("date", dateFromRaw);
  if (dateToRaw) query = query.lte("date", dateToRaw);

  const { data: rows } = await query;
  const items = (rows ?? []) as Record<string, unknown>[];

  const hasMore = items.length > PAGE_SIZE;
  const slice = hasMore ? items.slice(0, PAGE_SIZE) : items;

  return NextResponse.json({
    emails: slice.map((r) => dbEmailToApiEmail(r)),
    nextCursor: hasMore ? slice[slice.length - 1]?.date : undefined,
  });
}

/**
 * GET /api/emails — paginated email list
 *
 * Query params:
 *   accountId        – filter to one account (optional)
 *   label            – filter by label name (optional)
 *   cursor           – pagination cursor (optional)
 *   limit            – page size, max 100 (optional, default 50)
 *   unread           – "true" to show only unread (optional)
 *   starred          – "true" to show only starred (optional)
 *   hasAttachments   – "true" to show only emails with attachments (optional)
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { queryInbox } from "@/lib/inbox";

/** GET /api/emails */
export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const accountId = searchParams.get("accountId") ?? undefined;
  const label = searchParams.get("label") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
  const unread = searchParams.get("unread") === "true" ? true : undefined;
  const starred = searchParams.get("starred") === "true" ? true : undefined;
  const hasAttachments =
    searchParams.get("hasAttachments") === "true" ? true : undefined;
  const drafts = searchParams.get("drafts") === "true" ? true : undefined;
  const priority = searchParams.get("priority") === "high" ? true : undefined;

  const result = await queryInbox({
    userId: session.user.id,
    accountId,
    label,
    cursor,
    limit,
    unreadOnly: unread,
    starredOnly: starred,
    hasAttachments,
    draftsOnly: drafts,
    priorityOnly: priority,
  });

  return NextResponse.json(result);
}

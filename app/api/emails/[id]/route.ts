/**
 * GET  /api/emails/[id] — single email + thread messages
 * PATCH /api/emails/[id] — update email (isRead, isStarred, labels, archived, trashed)
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { dbEmailToApiEmail } from "@/lib/inbox";
import { getProviderAdapter } from "@/lib/sync";
import { ValidationError, NotFoundError } from "@/lib/errors";

const patchSchema = z.object({
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  labels: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
  trashed: z.boolean().optional(),
});

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/emails/[id]
 * Returns the email and all messages in the same thread.
 */
export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership: email must belong to one of the user's accounts
  const { data: userAccounts } = await supabase
    .from("Account")
    .select("id")
    .eq("userId", session.user.id);
  const accountIds = (userAccounts ?? []).map(
    (a: Record<string, unknown>) => a.id as string,
  );

  const { data: email } = await supabase
    .from("CachedEmail")
    .select("*")
    .eq("id", params.id)
    .in("accountId", accountIds)
    .single();

  if (!email) {
    const err = new NotFoundError("Email", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const row = email as Record<string, unknown>;

  const { data: threadMessages } = await supabase
    .from("CachedEmail")
    .select("*")
    .eq("threadId", row.threadId as string)
    .eq("accountId", row.accountId as string)
    .order("date", { ascending: true });

  return NextResponse.json({
    email: dbEmailToApiEmail(row),
    thread: (threadMessages ?? []).map((m) => dbEmailToApiEmail(m)),
  });
}

/**
 * PATCH /api/emails/[id]
 * Updates email flags/labels, mirroring changes to the provider and DB.
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const err = new ValidationError("Invalid request body", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: err.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verify ownership
  const { data: userAccounts } = await supabase
    .from("Account")
    .select("id")
    .eq("userId", session.user.id);
  const accountIds = (userAccounts ?? []).map(
    (a: Record<string, unknown>) => a.id as string,
  );

  const { data: email } = await supabase
    .from("CachedEmail")
    .select("*")
    .eq("id", params.id)
    .in("accountId", accountIds)
    .single();

  if (!email) {
    const err = new NotFoundError("Email", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const row = email as Record<string, unknown>;

  // Fetch the account for provider adapter calls
  const { data: account } = await supabase
    .from("Account")
    .select("provider")
    .eq("id", row.accountId as string)
    .single();
  const acct = account as Record<string, unknown> | null;

  const { isRead, isStarred, labels, archived, trashed } = parsed.data;

  // Mirror changes to provider adapter (non-fatal)
  if (acct) {
    try {
      const adapter = await getProviderAdapter(acct.provider as string);
      if (isRead === true)
        await adapter.markRead(row.accountId as string, [
          row.messageId as string,
        ]);
      if (archived === true)
        await adapter.archive(row.accountId as string, [
          row.messageId as string,
        ]);
      if (trashed === true)
        await adapter.trash(row.accountId as string, [row.messageId as string]);
      if (labels && labels.length > 0) {
        await adapter.applyLabel(
          row.accountId as string,
          [row.messageId as string],
          labels[0],
        );
      }
    } catch {
      // Provider errors are non-fatal
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (isRead !== undefined) updateData.isRead = isRead;
  if (isStarred !== undefined) updateData.isStarred = isStarred;
  if (labels !== undefined) updateData.labels = JSON.stringify(labels);

  if (archived === true || trashed === true) {
    let current: string[] = [];
    try {
      current = JSON.parse(row.labels as string) as string[];
    } catch {
      current = [];
    }
    const withoutInbox = current.filter((l) => l !== "inbox");
    const next = archived
      ? [...new Set([...withoutInbox, "archived"])]
      : [...new Set([...withoutInbox, "trash"])];
    updateData.labels = JSON.stringify(next);
  }

  const { data: updated } = await supabase
    .from("CachedEmail")
    .update(updateData)
    .eq("id", params.id)
    .select("*")
    .single();

  return NextResponse.json({
    email: dbEmailToApiEmail(updated as Record<string, unknown>),
  });
}

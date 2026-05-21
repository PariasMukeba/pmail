/**
 * POST /api/ai/prioritize — bulk-prioritise emails with Claude.
 *
 * Body: `{ emailIds: string[] }`
 * Returns: `{ results: Array<{ id: string, priority: string }> }`
 *
 * Fetches up to 20 emails, runs `emailAI.prioritizeEmail` in parallel with a
 * concurrency limit of 5, and persists the results to `CachedEmail.aiPriority`.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { emailAI } from "@/lib/ai/email-ai";
import { ValidationError } from "@/lib/errors";

/** Maximum number of email IDs accepted in a single request. */
const MAX_EMAILS = 20;

/** Maximum number of concurrent Claude calls. */
const CONCURRENCY_LIMIT = 5;

const prioritizeSchema = z.object({
  emailIds: z.array(z.string()).min(1).max(MAX_EMAILS),
});

/**
 * Runs tasks with bounded concurrency.
 * Splits the input array into chunks of `limit` and awaits each chunk.
 */
async function withConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const chunk = tasks.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk.map((fn) => fn()));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * POST /api/ai/prioritize
 * Bulk-prioritises the given emails and persists the result.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = prioritizeSchema.safeParse(body);
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

  const { data: emailRows } = await supabase
    .from("CachedEmail")
    .select("*")
    .in("id", parsed.data.emailIds)
    .in("accountId", accountIds)
    .limit(MAX_EMAILS);

  const emails = (emailRows ?? []) as Record<string, unknown>[];

  const tasks = emails.map((email) => async () => {
    const priority = await emailAI.prioritizeEmail({
      subject: email.subject as string,
      from: {
        name: email.fromName as string,
        address: email.fromAddress as string,
      },
      textBody: email.bodyText as string | null | undefined,
      body: email.bodyHtml as string | null | undefined,
      receivedAt: new Date(email.receivedAt as string),
    });

    await supabase
      .from("CachedEmail")
      .update({ aiPriority: priority, updatedAt: new Date().toISOString() })
      .eq("id", email.id as string);

    return { id: email.id as string, priority };
  });

  const results = await withConcurrencyLimit(tasks, CONCURRENCY_LIMIT);

  return NextResponse.json({ results });
}

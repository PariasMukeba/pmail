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
import { prisma } from "@/lib/prisma";
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

  const emails = await prisma.cachedEmail.findMany({
    where: {
      id: { in: parsed.data.emailIds },
      account: { userId: session.user.id },
    },
    take: MAX_EMAILS,
  });

  const tasks = emails.map((email) => async () => {
    const priority = await emailAI.prioritizeEmail({
      subject: email.subject,
      from: { name: email.fromName, address: email.fromAddress },
      textBody: email.bodyText,
      body: email.bodyHtml,
      receivedAt: email.receivedAt,
    });

    await prisma.cachedEmail.update({
      where: { id: email.id },
      data: { aiPriority: priority },
    });

    return { id: email.id, priority };
  });

  const results = await withConcurrencyLimit(tasks, CONCURRENCY_LIMIT);

  return NextResponse.json({ results });
}

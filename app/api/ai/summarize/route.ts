/**
 * POST /api/ai/summarize — summarise a single email with Claude.
 *
 * Body: `{ emailId: string }`
 * Returns: `{ summary: string }`
 *
 * The resulting summary is persisted to `CachedEmail.aiSummary` so that
 * subsequent requests return the cached value without re-querying Claude.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { emailAI } from "@/lib/ai/email-ai";
import { ValidationError, NotFoundError } from "@/lib/errors";

const summarizeSchema = z.object({
  emailId: z.string(),
});

/**
 * POST /api/ai/summarize
 * Fetches the email, calls emailAI.summarizeEmail(), saves the result to DB,
 * and returns the summary string.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = summarizeSchema.safeParse(body);
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

  const { data: emailRow } = await supabase
    .from("CachedEmail")
    .select("*")
    .eq("id", parsed.data.emailId)
    .in("accountId", accountIds)
    .single();

  if (!emailRow) {
    const err = new NotFoundError("Email", parsed.data.emailId);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const email = emailRow as Record<string, unknown>;

  // Return cached summary if available
  if (email.aiSummary) {
    return NextResponse.json({ summary: email.aiSummary });
  }

  const result = await emailAI.summarizeEmail({
    subject: email.subject as string,
    from: {
      name: email.fromName as string,
      address: email.fromAddress as string,
    },
    textBody: email.bodyText as string | null | undefined,
    body: email.bodyHtml as string | null | undefined,
    receivedAt: new Date(email.receivedAt as string),
  });

  if (!result) {
    return NextResponse.json({ summary: "" });
  }

  await supabase
    .from("CachedEmail")
    .update({
      aiSummary: result.summary,
      aiActionItems: JSON.stringify(result.actionItems),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", email.id as string);

  return NextResponse.json({ summary: result.summary });
}

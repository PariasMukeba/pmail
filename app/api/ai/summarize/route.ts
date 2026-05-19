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
import { prisma } from "@/lib/prisma";
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

  const email = await prisma.cachedEmail.findFirst({
    where: {
      id: parsed.data.emailId,
      account: { userId: session.user.id },
    },
  });

  if (!email) {
    const err = new NotFoundError("Email", parsed.data.emailId);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  // Return cached summary if available
  if (email.aiSummary) {
    return NextResponse.json({ summary: email.aiSummary });
  }

  const result = await emailAI.summarizeEmail({
    subject: email.subject,
    from: { name: email.fromName, address: email.fromAddress },
    textBody: email.bodyText,
    body: email.bodyHtml,
    receivedAt: email.receivedAt,
  });

  if (!result) {
    return NextResponse.json({ summary: "" });
  }

  await prisma.cachedEmail.update({
    where: { id: email.id },
    data: {
      aiSummary: result.summary,
      aiActionItems: JSON.stringify(result.actionItems),
    },
  });

  return NextResponse.json({ summary: result.summary });
}

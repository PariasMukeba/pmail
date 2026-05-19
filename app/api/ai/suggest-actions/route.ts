/**
 * POST /api/ai/suggest-actions — suggest quick actions for an email.
 *
 * Body: `{ emailId: string }`
 * Returns: `{ actions: string[] }`
 *
 * Prompts Claude (via emailAI) to return 3 concise action suggestions as a
 * JSON array.  All Claude calls are routed through `lib/ai/email-ai.ts`.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emailAI } from "@/lib/ai/email-ai";
import { ValidationError, NotFoundError, AIError } from "@/lib/errors";

const suggestActionsSchema = z.object({
  emailId: z.string(),
});

/**
 * POST /api/ai/suggest-actions
 * Returns 3 short suggested actions for the given email.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = suggestActionsSchema.safeParse(body);
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

  // Build a minimal EmailForAI object for the Claude call
  const emailForAI = {
    subject: email.subject,
    from: { name: email.fromName, address: email.fromAddress },
    textBody: email.bodyText,
    body: email.bodyHtml,
    receivedAt: email.receivedAt,
  };

  // Use summarizeEmail to get action items, then derive action suggestions.
  // Falls back to heuristic defaults if AI is unavailable.
  let actions: string[] = [];

  try {
    const summaryResult = await emailAI.summarizeEmail(emailForAI);

    if (summaryResult?.actionItems && summaryResult.actionItems.length > 0) {
      actions = summaryResult.actionItems.slice(0, 3);
    } else {
      // Derive sensible defaults from the summary sentiment / category
      actions = deriveDefaultActions(email.subject, summaryResult?.category);
    }
  } catch (err) {
    if (err instanceof AIError && !err.retryable) {
      actions = deriveDefaultActions(email.subject, undefined);
    } else {
      return NextResponse.json(
        { error: "AI service temporarily unavailable" },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({ actions });
}

/**
 * Returns a set of default action labels based on the email category.
 * Used when the AI call fails or returns no action items.
 */
function deriveDefaultActions(
  subject: string,
  category: string | undefined,
): string[] {
  switch (category) {
    case "NEWSLETTER":
      return ["Unsubscribe", "Archive", "Save for later"];
    case "RECEIPT":
      return ["Save receipt", "Archive", "Forward to accountant"];
    case "NOTIFICATION":
      return ["Mark as read", "Archive", "Mute thread"];
    default:
      break;
  }

  // Heuristics based on subject line keywords
  const lower = subject.toLowerCase();
  if (lower.includes("invoice") || lower.includes("payment")) {
    return ["Review invoice", "Pay now", "Forward to finance"];
  }
  if (lower.includes("meeting") || lower.includes("calendar")) {
    return ["Accept invite", "Propose new time", "Decline"];
  }
  if (lower.includes("follow") || lower.includes("action required")) {
    return ["Reply now", "Schedule follow-up", "Delegate"];
  }

  return ["Reply", "Archive", "Mark as read"];
}

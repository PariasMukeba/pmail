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
import { supabase } from "@/lib/supabase";
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

  const emailForAI = {
    subject: email.subject as string,
    from: {
      name: email.fromName as string,
      address: email.fromAddress as string,
    },
    textBody: email.bodyText as string | null | undefined,
    body: email.bodyHtml as string | null | undefined,
    receivedAt: new Date(email.receivedAt as string),
  };

  let actions: string[] = [];

  try {
    const summaryResult = await emailAI.summarizeEmail(emailForAI);

    if (summaryResult?.actionItems && summaryResult.actionItems.length > 0) {
      actions = summaryResult.actionItems.slice(0, 3);
    } else {
      actions = deriveDefaultActions(
        email.subject as string,
        summaryResult?.category,
      );
    }
  } catch (err) {
    if (err instanceof AIError && !err.retryable) {
      actions = deriveDefaultActions(email.subject as string, undefined);
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

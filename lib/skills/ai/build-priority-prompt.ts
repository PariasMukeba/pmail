import { AI_PROMPT_CONTEXT_MAX_TOKENS } from "../../constants";

export interface PromptMessages {
  system: string;
  user: string;
}

/**
 * Build the Claude prompt messages for email priority scoring.
 *
 * Claude must return exactly one word: "high", "normal", or "low".
 * The response is parsed by `parse-priority-response.ts`.
 *
 * @sideEffects none — pure function
 */
export function buildPriorityPrompt(email: {
  subject: string | null;
  from: string | null;
  textBody: string | null;
  receivedAt: Date;
}): PromptMessages {
  const system = `You are an email priority classifier. Classify the email as exactly one of:

high    — requires a response or action within 24 hours; sent by a known person (not a mailing list); contains time-sensitive language, a direct question, or an explicit request
normal  — informational; no immediate action required; or the sender cannot be determined
low     — newsletter, marketing, automated notification, receipt, or clearly non-actionable

Respond with ONLY the single word: high, normal, or low.
No punctuation, no explanation, no other text.`;

  const body = truncate(email.textBody ?? "(no body)", AI_PROMPT_CONTEXT_MAX_TOKENS);

  const user = [
    `From: ${email.from ?? "unknown"}`,
    `Subject: ${email.subject ?? "(no subject)"}`,
    `Received: ${email.receivedAt.toUTCString()}`,
    "",
    body,
  ].join("\n");

  return { system, user };
}

function truncate(text: string, maxTokens: number): string {
  if (text.length / 4 <= maxTokens) return text;
  return text.slice(0, maxTokens * 4) + "\n[truncated]";
}

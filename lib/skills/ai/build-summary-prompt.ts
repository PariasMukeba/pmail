import { AI_PROMPT_CONTEXT_MAX_TOKENS } from "../../constants";

export interface PromptMessages {
  system: string;
  user: string;
}

/**
 * Build the Claude prompt messages for email summarisation.
 *
 * Returns a `{ system, user }` pair ready to be passed to the Anthropic SDK.
 * The system prompt is static and cacheable; the user message contains the email.
 *
 * Input body is truncated to `AI_PROMPT_CONTEXT_MAX_TOKENS` (estimated as
 * chars / 4) to keep cost and latency predictable.
 *
 * @sideEffects none — pure function
 */
export function buildSummaryPrompt(email: {
  subject: string | null;
  from: string | null;
  textBody: string | null;
  receivedAt: Date;
}): PromptMessages {
  const system = `You are a concise email assistant. Analyse the email provided and return ONLY valid JSON matching this exact schema — no preamble, no markdown fences, no explanation:

{
  "summary":     string,   // 1–3 sentences, plain text, no markdown
  "actionItems": string[], // action items for the recipient; empty array if none
  "sentiment":   "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "URGENT",
  "category":    "PERSONAL" | "WORK" | "NEWSLETTER" | "NOTIFICATION" | "RECEIPT" | "SPAM" | "OTHER"
}

Rules:
- summary must not start with "This email" or repeat the subject line
- actionItems must be concrete tasks, not observations ("Reply by Friday" ✓, "The email mentions a deadline" ✗)
- sentiment URGENT means the email contains a time-sensitive request or emergency
- Return {} if the body is empty or unparseable`;

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

/** Estimate token count as chars / 4; truncate and append marker if exceeded. */
function truncate(text: string, maxTokens: number): string {
  if (text.length / 4 <= maxTokens) return text;
  return text.slice(0, maxTokens * 4) + "\n[truncated]";
}

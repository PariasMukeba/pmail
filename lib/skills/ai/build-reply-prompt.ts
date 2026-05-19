import { AI_PROMPT_CONTEXT_MAX_TOKENS } from "../../constants";

export type ReplyTone = "professional" | "friendly" | "brief";

export interface PromptMessages {
  system: string;
  user: string;
}

const TONE_INSTRUCTION: Record<ReplyTone, string> = {
  professional: "Write in a formal, professional tone. Be polite and direct.",
  friendly: "Write in a warm, conversational, friendly tone. Match the energy of the thread.",
  brief: "Write in 2–3 sentences maximum. Be as concise as possible while remaining polite.",
};

/**
 * Build the Claude prompt messages for AI-assisted reply drafting.
 *
 * Thread context is assembled from the last `maxContextMessages` emails
 * (oldest first) to give Claude the full conversational arc. If total context
 * exceeds the token budget, oldest messages are dropped first.
 *
 * Style exemplars (sentences sampled from the user's Sent folder) calibrate
 * Claude to match the user's natural writing voice.
 *
 * @sideEffects none — pure function
 */
export function buildReplyPrompt(options: {
  threadMessages: Array<{
    from: string | null;
    textBody: string | null;
    receivedAt: Date;
  }>;
  /** 2–3 sentences sampled from user's recent sent emails for style calibration. */
  styleExemplars: string[];
  tone: ReplyTone;
}): PromptMessages {
  const { threadMessages, styleExemplars, tone } = options;

  const system = `You are an email assistant drafting a reply on behalf of the user.

${TONE_INSTRUCTION[tone]}

Output rules (strictly followed):
- Return ONLY the reply body — no subject line, no salutation explanation, no sign-off instruction
- No markdown formatting (no **bold**, no bullet points unless the user's exemplars use them)
- No meta-commentary ("Here is a draft:", "I've written:", etc.)
- Match the language of the most recent message in the thread (reply in the same language)

${
  styleExemplars.length > 0
    ? `User's writing style (sample sentences for calibration):\n${styleExemplars.map((s) => `- ${s}`).join("\n")}`
    : ""
}`;

  const threadContext = buildThreadContext(threadMessages);

  const user = [
    "Thread (oldest first):",
    "",
    threadContext,
    "",
    "Draft a reply to the most recent message above.",
  ].join("\n");

  return { system, user };
}

function buildThreadContext(
  messages: Array<{
    from: string | null;
    textBody: string | null;
    receivedAt: Date;
  }>,
): string {
  const MAX_CONTEXT_TOKENS = AI_PROMPT_CONTEXT_MAX_TOKENS;
  const MAX_PER_MESSAGE = Math.floor(MAX_CONTEXT_TOKENS / Math.max(messages.length, 1));

  return messages
    .map((msg, i) => {
      const body = truncate(msg.textBody ?? "(no body)", MAX_PER_MESSAGE);
      return [
        `--- Message ${i + 1} | From: ${msg.from ?? "unknown"} | ${msg.receivedAt.toUTCString()} ---`,
        body,
      ].join("\n");
    })
    .join("\n\n");
}

function truncate(text: string, maxTokens: number): string {
  if (text.length / 4 <= maxTokens) return text;
  return text.slice(0, maxTokens * 4) + "\n[truncated]";
}

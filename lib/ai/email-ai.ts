import Anthropic from "@anthropic-ai/sdk";
import { buildPriorityPrompt } from "@/lib/skills/ai/build-priority-prompt";
import { buildSummaryPrompt } from "@/lib/skills/ai/build-summary-prompt";
import { buildReplyPrompt, type ReplyTone } from "@/lib/skills/ai/build-reply-prompt";
import { parsePriorityResponse, type Priority } from "@/lib/skills/ai/parse-priority-response";
import { AIError } from "@/lib/errors";
import { SUMMARY_MAX_TOKENS, PRIORITY_MAX_TOKENS, REPLY_DRAFT_MAX_TOKENS } from "@/lib/constants";

/** Version bumped whenever any system prompt changes. Used for cache invalidation. */
export const PROMPT_VERSION = "1.0.0";

/** `from` field can be a plain string or a structured address object. */
type FromField = string | { name: string; address: string } | null;

/**
 * Minimal email fields required for AI analysis.
 * Accepts both PlainEmail (textBody, receivedAt) and the API Email type (body, date).
 */
export interface EmailForAI {
  subject: string | null;
  from: FromField;
  /** HTML body — used when textBody is absent. Tags are stripped before prompting. */
  body?: string | null;
  /** Plain-text body — preferred over body when both are present. */
  textBody?: string | null;
  date?: Date;
  receivedAt?: Date;
}

export interface SummaryResult {
  summary: string;
  actionItems: string[];
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "URGENT";
  category: "PERSONAL" | "WORK" | "NEWSLETTER" | "NOTIFICATION" | "RECEIPT" | "SPAM" | "OTHER";
}

function extractFrom(from: FromField): string | null {
  if (!from) return null;
  if (typeof from === "string") return from;
  return from.address;
}

function extractBody(email: EmailForAI): string | null {
  if (email.textBody) return email.textBody;
  if (email.body) {
    return email.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
  }
  return null;
}

function extractDate(email: EmailForAI): Date {
  return email.receivedAt ?? email.date ?? new Date();
}

const client = new Anthropic();

/**
 * Central module for all Claude-powered email analysis.
 *
 * All Anthropic SDK calls in the application MUST go through this module.
 * Never call the Anthropic SDK directly from components or API routes.
 */
export const emailAI = {
  PROMPT_VERSION,

  /**
   * Classify an email as 'high', 'normal', or 'low' priority.
   *
   * @throws {AIError} retryable=true on 429, retryable=false on other errors.
   */
  async prioritizeEmail(email: EmailForAI): Promise<Priority> {
    const { system, user } = buildPriorityPrompt({
      subject: email.subject,
      from: extractFrom(email.from),
      textBody: extractBody(email),
      receivedAt: extractDate(email),
    });

    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: PRIORITY_MAX_TOKENS,
        system: [
          { type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } },
        ],
        messages: [{ role: "user" as const, content: user }],
      });

      const raw =
        message.content[0]?.type === "text" ? message.content[0].text : "normal";
      return parsePriorityResponse(raw);
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        throw new AIError(
          "prioritize",
          err.status === 429,
          `Anthropic API error ${err.status}: ${err.message}`,
        );
      }
      throw new AIError("prioritize", false, String(err));
    }
  },

  /**
   * Summarise an email and extract action items, sentiment, and category.
   * Returns null if the response is not valid JSON or the body is empty.
   */
  async summarizeEmail(email: EmailForAI): Promise<SummaryResult | null> {
    const body = extractBody(email);
    if (!body?.trim()) return null;

    const { system, user } = buildSummaryPrompt({
      subject: email.subject,
      from: extractFrom(email.from),
      textBody: body,
      receivedAt: extractDate(email),
    });

    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: SUMMARY_MAX_TOKENS,
        system: [
          { type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } },
        ],
        messages: [{ role: "user" as const, content: user }],
      });

      const raw =
        message.content[0]?.type === "text" ? message.content[0].text : null;
      if (!raw) return null;
      return JSON.parse(raw) as SummaryResult;
    } catch {
      return null;
    }
  },

  /**
   * Draft a reply to the provided thread.
   *
   * @throws {AIError} on API failure.
   */
  async draftReply(options: {
    threadMessages: Array<{ from: string | null; textBody: string | null; receivedAt: Date }>;
    styleExemplars: string[];
    tone: ReplyTone;
  }): Promise<string> {
    const { system, user } = buildReplyPrompt(options);

    try {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: REPLY_DRAFT_MAX_TOKENS,
        system: [
          { type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } },
        ],
        messages: [{ role: "user" as const, content: user }],
      });

      return message.content[0]?.type === "text" ? message.content[0].text : "";
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        throw new AIError("draftReply", err.status === 429, `Anthropic API error: ${err.message}`);
      }
      throw new AIError("draftReply", false, String(err));
    }
  },
};

// ── Email skills ──────────────────────────────────────────────────────────────
export { parseMime } from "./email/parse-mime";
export type { ParsedEmail, ParsedAttachment } from "./email/parse-mime";

export { extractThreads } from "./email/extract-thread";
export type { EmailForThreading, ThreadGroup } from "./email/extract-thread";

export { detectNewsletter } from "./email/detect-newsletter";
export type { NewsletterDetection } from "./email/detect-newsletter";

export { sanitizeHtml } from "./email/sanitize-html";

// ── AI skills ─────────────────────────────────────────────────────────────────
export { buildSummaryPrompt } from "./ai/build-summary-prompt";
export { buildReplyPrompt } from "./ai/build-reply-prompt";
export type { ReplyTone } from "./ai/build-reply-prompt";
export { buildPriorityPrompt } from "./ai/build-priority-prompt";
export { parsePriorityResponse } from "./ai/parse-priority-response";
export type { Priority } from "./ai/parse-priority-response";
export type { PromptMessages } from "./ai/build-summary-prompt";

// ── Sync skills ───────────────────────────────────────────────────────────────
export { refreshGmailToken } from "./sync/refresh-gmail-token";
export type { GmailTokenResult } from "./sync/refresh-gmail-token";

export { mapGmailLabels } from "./sync/map-gmail-labels";
export type { StandardLabel } from "./sync/map-gmail-labels";

// ── Crypto skills ─────────────────────────────────────────────────────────────
export { encryptImapPassword } from "./crypto/encrypt-imap-password";
export type { EncryptedValue } from "./crypto/encrypt-imap-password";
export { decryptImapPassword } from "./crypto/decrypt-imap-password";

// ── Format skills ─────────────────────────────────────────────────────────────
export { formatRelativeDate } from "./format/relative-date";

/**
 * Standard internal mailbox type names used across all providers.
 * Matches the `MailboxType` enum in the Prisma schema.
 */
export type StandardLabel =
  | "inbox"
  | "sent"
  | "drafts"
  | "trash"
  | "spam"
  | "starred"
  | "important"
  | "unread"
  | string; // user-defined labels pass through

/** Gmail system label ID → Pmail standard label name. */
const SYSTEM_LABEL_MAP: Record<string, StandardLabel> = {
  INBOX: "inbox",
  SENT: "sent",
  DRAFT: "drafts",
  TRASH: "trash",
  SPAM: "spam",
  STARRED: "starred",
  IMPORTANT: "important",
  UNREAD: "unread",
  // Gmail sometimes returns these alternate casings from the API:
  Draft: "drafts",
  Sent: "sent",
};

/**
 * Map an array of Gmail label IDs to Pmail's standard label names.
 *
 * System labels (INBOX, SENT, DRAFT, etc.) are translated via the mapping
 * table. User-defined labels are lowercased and returned as-is.
 * Unknown system-style labels (all-caps) are lowercased.
 *
 * @example
 *   mapGmailLabels(["INBOX", "STARRED", "Label_12345"])
 *   // → ["inbox", "starred", "label_12345"]
 *
 * @sideEffects none — pure function
 */
export function mapGmailLabels(gmailLabelIds: string[]): StandardLabel[] {
  return gmailLabelIds.map((id) => SYSTEM_LABEL_MAP[id] ?? id.toLowerCase());
}

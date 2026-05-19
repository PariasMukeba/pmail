/**
 * Shared types for all email provider sync adapters.
 *
 * `EmailProvider` is the interface every adapter (Gmail, Microsoft, IMAP)
 * must implement. `EmailData` is the normalised wire format that adapters
 * return — it maps 1-to-1 with the `CachedEmail` Prisma model.
 */

/** Result of a single page of email fetch, including pagination cursors. */
export interface SyncResult {
  emails: EmailData[];
  /** Gmail-style page cursor for the next page of list results. */
  nextPageToken?: string;
  /** Gmail history ID — used for incremental delta sync. */
  historyId?: string;
  /** Microsoft Graph delta link — used for incremental delta sync. */
  deltaLink?: string;
}

/**
 * Normalised email record returned by all provider adapters.
 * Array fields (toAddresses, ccAddresses, labels) are stored as JSON strings
 * so they can be persisted directly to the SQLite CachedEmail table.
 */
export interface EmailData {
  messageId: string;
  threadId: string;
  subject: string;
  fromName: string;
  fromAddress: string;
  /** JSON-encoded `Array<{name: string; address: string}>` */
  toAddresses: string;
  /** JSON-encoded `Array<{name: string; address: string}>` */
  ccAddresses: string;
  preview: string;
  bodyText?: string;
  bodyHtml?: string;
  rawMime?: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  /** JSON-encoded `string[]` of label names */
  labels: string;
  hasAttachments: boolean;
  inReplyTo?: string;
  references?: string;
}

/**
 * Contract that every provider adapter must satisfy.
 * All methods receive an `accountId` (Prisma Account.id) so they can load
 * credentials from the database themselves.
 */
export interface EmailProvider {
  /**
   * Fetch a page of emails from the provider inbox.
   * Supports both full and incremental (delta) sync modes.
   */
  fetchEmails(accountId: string, options: FetchOptions): Promise<SyncResult>;

  /** Fetch all messages belonging to a single thread. */
  fetchThread(accountId: string, threadId: string): Promise<EmailData[]>;

  /** Download a single attachment and return raw bytes. */
  fetchAttachment(
    accountId: string,
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer>;

  /** Mark one or more messages as read. */
  markRead(accountId: string, messageIds: string[]): Promise<void>;

  /** Remove messages from the inbox (archive) without deleting them. */
  archive(accountId: string, messageIds: string[]): Promise<void>;

  /** Move messages to the provider trash / deleted-items folder. */
  trash(accountId: string, messageIds: string[]): Promise<void>;

  /** Add a label / category / folder tag to one or more messages. */
  applyLabel(
    accountId: string,
    messageIds: string[],
    labelId: string,
  ): Promise<void>;

  /** Send an email on behalf of the account. */
  sendEmail(accountId: string, draft: DraftData): Promise<SentResult>;
}

/** Options controlling how a page of emails is fetched. */
export interface FetchOptions {
  /** Opaque cursor returned by the previous fetch (Gmail pageToken / IMAP UID offset). */
  pageToken?: string;
  /** Maximum number of messages to return. */
  maxResults?: number;
  /** Filter by Gmail label IDs (Gmail only). */
  labelIds?: string[];
  /** Full-text / advanced search query string. */
  q?: string;
  /** If true, use delta / history sync instead of a full re-fetch. */
  incremental?: boolean;
}

/** Outgoing message payload used by `sendEmail`. */
export interface DraftData {
  to: Array<{ name: string; address: string }>;
  cc?: Array<{ name: string; address: string }>;
  bcc?: Array<{ name: string; address: string }>;
  subject: string;
  body: string;
  attachments?: Array<{ name: string; content: Buffer; mimeType: string }>;
  /** Provider message ID of the message being replied to. */
  inReplyToId?: string;
}

/** Identifiers returned after a message is successfully sent. */
export interface SentResult {
  messageId: string;
  threadId: string;
}

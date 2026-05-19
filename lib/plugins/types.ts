import type { ReactNode } from "react";

// ── Shared domain types ───────────────────────────────────────────────────────

/** Minimal email record shape (mirrors the Prisma Email model). */
export interface EmailRecord {
  id: string;
  threadId: string;
  accountId: string;
  providerEmailId: string | null;
  receivedAt: Date;
  isRead: boolean;
  isDraft: boolean;
  isOutbound: boolean;
  hasAttachments: boolean;
  sizeEstimate: number | null;
}

/** Minimal thread record shape (mirrors the Prisma Thread model). */
export interface ThreadRecord {
  id: string;
  accountId: string;
  lastMessageAt: Date;
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
}

export interface OutboundDraft {
  to: string[];
  cc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  inReplyToMessageId?: string;
  attachmentStorageKeys?: string[];
}

export interface SyncOptions {
  /** Only return messages received after this date. */
  since?: Date;
  /** Maximum number of messages to return. */
  limit?: number;
  mailboxType?: "inbox" | "sent" | "drafts" | "trash" | "spam" | "all";
}

export interface RawMessage {
  /** Provider-assigned message ID. */
  providerEmailId: string;
  /** Raw RFC 2822 message string. Provider must supply this. */
  raw: string;
  providerLabelIds: string[];
  isRead: boolean;
  isDraft: boolean;
}

export interface SyncResult {
  messages: RawMessage[];
  /** Opaque cursor for the next delta call. Null means no more pages. */
  nextCursor: string | null;
}

export interface SentResult {
  providerEmailId: string;
  sentAt: Date;
}

/**
 * An opaque connection handle returned by `plugin.connect()`.
 * Plugins extend this with their own fields.
 */
export interface ProviderConnection {
  accountId: string;
  /** ISO 8601 expiry time of the access token. */
  tokenExpiresAt: string | null;
}

// ── AI plugin context ─────────────────────────────────────────────────────────

export interface AIContext {
  userId: string;
  accountId: string;
  /** Serialised UserSettings for the current user. */
  userSettings: Record<string, unknown>;
}

export interface AIPluginResult {
  pluginId: string;
  /** Plugin-specific data payload. Structure defined by each plugin. */
  data: Record<string, unknown>;
}

// ── Plugin interfaces ─────────────────────────────────────────────────────────

/**
 * A plugin that adds support for an email provider (IMAP server, JMAP service,
 * bridge application, etc.).
 *
 * All methods are called server-side only. Plugins must never expose credentials
 * or connection handles to client-side code.
 */
export interface EmailProviderPlugin {
  /** Unique kebab-case identifier. Must not change after release. */
  id: string;
  displayName: string;
  /** SVG string or absolute URL to the provider icon. */
  icon: string;
  authType: "oauth2" | "imap" | "bridge";

  /**
   * Authenticate and return a connection handle.
   * `credentials` is provider-specific — plugins define and validate it.
   */
  connect(credentials: unknown): Promise<ProviderConnection>;

  /** Verify a connection is still alive (used by health checks). */
  testConnection(connection: ProviderConnection): Promise<boolean>;

  /** Fetch new or changed messages since the last sync cursor. */
  fetchEmails(connection: ProviderConnection, options: SyncOptions): Promise<SyncResult>;

  /** Fetch a full thread with all its messages. */
  fetchThread(connection: ProviderConnection, threadId: string): Promise<ThreadRecord>;

  /** Send a composed message through the provider. */
  sendEmail(connection: ProviderConnection, draft: OutboundDraft): Promise<SentResult>;

  markRead(connection: ProviderConnection, providerEmailIds: string[]): Promise<void>;
  archive(connection: ProviderConnection, providerEmailIds: string[]): Promise<void>;
  trash(connection: ProviderConnection, providerEmailIds: string[]): Promise<void>;
}

/**
 * A plugin that adds an AI-powered feature to the reading or compose experience.
 *
 * The `process` method runs server-side. The `renderResult` method runs in a
 * Client Component — it must be a thin presentational layer only.
 */
export interface AIFeaturePlugin {
  /** Unique kebab-case identifier. Must not change after release. */
  id: string;
  displayName: string;
  description: string;

  /**
   * When the plugin processes emails:
   * - `on-receive`  — automatically after sync, for every new email
   * - `on-open`     — when the user opens a thread
   * - `on-demand`   — only when the user explicitly triggers it
   */
  trigger: "on-receive" | "on-open" | "on-demand";

  /**
   * Process an email and return a result.
   * MUST call AI via `lib/ai/email-ai.ts` — never import Anthropic SDK directly.
   *
   * @sideEffects network (AI call), optionally database
   */
  process(email: EmailRecord, context: AIContext): Promise<AIPluginResult>;

  /**
   * Render the plugin result as a React node for display in the reading pane.
   * Runs in a Client Component. Return null to show nothing.
   */
  renderResult(result: AIPluginResult): ReactNode;
}

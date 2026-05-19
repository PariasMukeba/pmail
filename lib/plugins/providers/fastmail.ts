/**
 * Fastmail provider plugin — JMAP-based.
 *
 * JMAP (RFC 8620, RFC 8621) is Fastmail's native API. It is significantly more
 * efficient than IMAP for sync: a single JMAP request can fetch new messages,
 * thread them, and update state atomically.
 *
 * Status: STUB — connection and sync methods throw NotImplementedError.
 * Full implementation tracked in: specs/features/fastmail-provider.md (to be written)
 */

import type {
  EmailProviderPlugin,
  ProviderConnection,
  SyncOptions,
  SyncResult,
  ThreadRecord,
  OutboundDraft,
  SentResult,
} from "../types";

interface FastmailConnection extends ProviderConnection {
  sessionUrl: string;
  accountId: string;
  bearerToken: string;
}

function notImplemented(method: string): never {
  throw new Error(`Fastmail plugin: ${method} is not yet implemented`);
}

const fastmailPlugin: EmailProviderPlugin = {
  id: "fastmail",
  displayName: "Fastmail",
  authType: "oauth2",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0066FF">
    <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>`,

  async connect(_credentials: unknown): Promise<FastmailConnection> {
    // TODO: Exchange OAuth code for bearer token via Fastmail OAuth endpoint.
    // TODO: Fetch JMAP session URL from https://api.fastmail.com/.well-known/jmap
    notImplemented("connect");
  },

  async testConnection(_connection: ProviderConnection): Promise<boolean> {
    // TODO: Make a JMAP session request; return false if 401.
    notImplemented("testConnection");
  },

  async fetchEmails(
    _connection: ProviderConnection,
    _options: SyncOptions,
  ): Promise<SyncResult> {
    // TODO: JMAP Email/query + Email/get with state-based delta sync.
    notImplemented("fetchEmails");
  },

  async fetchThread(
    _connection: ProviderConnection,
    _threadId: string,
  ): Promise<ThreadRecord> {
    // TODO: JMAP Thread/get to fetch all messages in a thread.
    notImplemented("fetchThread");
  },

  async sendEmail(
    _connection: ProviderConnection,
    _draft: OutboundDraft,
  ): Promise<SentResult> {
    // TODO: JMAP Email/set (create) + EmailSubmission/set.
    notImplemented("sendEmail");
  },

  async markRead(
    _connection: ProviderConnection,
    _ids: string[],
  ): Promise<void> {
    notImplemented("markRead");
  },

  async archive(_connection: ProviderConnection, _ids: string[]): Promise<void> {
    notImplemented("archive");
  },

  async trash(_connection: ProviderConnection, _ids: string[]): Promise<void> {
    notImplemented("trash");
  },
};

export default fastmailPlugin;

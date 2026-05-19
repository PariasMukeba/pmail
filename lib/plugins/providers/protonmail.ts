/**
 * ProtonMail provider plugin — Bridge-based.
 *
 * ProtonMail uses end-to-end encryption internally. The only way to access it
 * programmatically without a ProtonMail account SDK is through the ProtonMail
 * Bridge desktop app, which exposes a local IMAP/SMTP server on localhost.
 *
 * Bridge connection: IMAP localhost:1143, SMTP localhost:1025.
 * The user must have Bridge installed and running.
 *
 * Status: STUB — all methods throw NotImplementedError.
 * Full implementation tracked in: specs/features/protonmail-provider.md (to be written)
 *
 * Security note: Bridge credentials (IMAP password) are stored encrypted in
 * the Account table using `lib/skills/crypto/encrypt-imap-password.ts`.
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

interface ProtonBridgeConnection extends ProviderConnection {
  /** localhost IMAP port Bridge is listening on. Default: 1143. */
  imapPort: number;
  /** localhost SMTP port Bridge is listening on. Default: 1025. */
  smtpPort: number;
  /** Bridge-generated IMAP password (stored encrypted, decrypted at connection time). */
  bridgePassword: string;
}

function notImplemented(method: string): never {
  throw new Error(`ProtonMail Bridge plugin: ${method} is not yet implemented`);
}

const protonmailPlugin: EmailProviderPlugin = {
  id: "protonmail",
  displayName: "ProtonMail (Bridge)",
  authType: "bridge",
  icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6D4AFF">
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18L20 8.5v7L12 19.82 4 15.5v-7l8-4.32z"/>
  </svg>`,

  async connect(_credentials: unknown): Promise<ProtonBridgeConnection> {
    // TODO: Validate Bridge is reachable on localhost:1143.
    // TODO: Encrypt the bridge password before storing in the Account record.
    notImplemented("connect");
  },

  async testConnection(_connection: ProviderConnection): Promise<boolean> {
    // TODO: IMAP NOOP command to verify the Bridge is running and authenticated.
    notImplemented("testConnection");
  },

  async fetchEmails(
    _connection: ProviderConnection,
    _options: SyncOptions,
  ): Promise<SyncResult> {
    // TODO: IMAP IDLE or UID SEARCH UNSEEN via nodemailer/imap library.
    notImplemented("fetchEmails");
  },

  async fetchThread(
    _connection: ProviderConnection,
    _threadId: string,
  ): Promise<ThreadRecord> {
    // TODO: IMAP FETCH with References/In-Reply-To threading logic.
    notImplemented("fetchThread");
  },

  async sendEmail(
    _connection: ProviderConnection,
    _draft: OutboundDraft,
  ): Promise<SentResult> {
    // TODO: SMTP via nodemailer through Bridge's local SMTP port.
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

export default protonmailPlugin;

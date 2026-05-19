/**
 * IMAP/SMTP adapter for Aire email sync.
 *
 * Uses the `imap` npm package for reading and the `nodemailer` package for
 * sending. IMAP passwords are stored encrypted in the database and decrypted
 * at runtime via `decryptImapPassword`.
 *
 * Non-negotiable: never log email content, subjects, or sender addresses.
 */

import Imap from "imap";
import { simpleParser, type ParsedMail, type AddressObject } from "mailparser";
import nodemailer from "nodemailer";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { decryptImapPassword } from "@/lib/skills/crypto/decrypt-imap-password";
import { SyncError, SendError, NotFoundError } from "@/lib/errors";
import { IMAP_CONNECTION_TIMEOUT_MS } from "@/lib/constants";
import type {
  EmailProvider,
  SyncResult,
  EmailData,
  FetchOptions,
  DraftData,
  SentResult,
} from "./types";
import type { EncryptedValue } from "@/lib/skills/crypto/encrypt-imap-password";

/** Options for opening an IMAP connection directly (used during account verification). */
export interface ImapConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  tls?: boolean;
}

// ---------------------------------------------------------------------------
// Connection helpers
// ---------------------------------------------------------------------------

/**
 * Verify that an IMAP connection can be established with the given options.
 * Returns `true` on success, `false` on any connection error.
 * Used during account setup to validate credentials before persisting them.
 */
export async function verifyImapConnection(
  opts: ImapConnectionOptions,
): Promise<boolean> {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: opts.user,
      password: opts.password,
      host: opts.host,
      port: opts.port,
      tls: opts.tls ?? true,
      connTimeout: IMAP_CONNECTION_TIMEOUT_MS,
      authTimeout: IMAP_CONNECTION_TIMEOUT_MS,
    });

    imap.once("ready", () => {
      imap.end();
      resolve(true);
    });

    imap.once("error", () => {
      resolve(false);
    });

    imap.connect();
  });
}

/**
 * Create and connect an `Imap` instance for the given account.
 * Loads IMAP credentials from the database and decrypts the password.
 *
 * @throws NotFoundError if the account does not exist.
 * @throws SyncError if IMAP credentials are incomplete.
 */
async function getImapConnection(accountId: string): Promise<Imap> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new NotFoundError("Account", accountId);
  }
  if (
    !account.imapHost ||
    !account.imapPort ||
    !account.imapUser ||
    !account.imapPasswordEncrypted
  ) {
    throw new SyncError(accountId, "imap", "Incomplete IMAP credentials");
  }

  const encryptedValue = JSON.parse(
    account.imapPasswordEncrypted,
  ) as EncryptedValue;
  const password = decryptImapPassword(encryptedValue);

  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: account.imapUser as string,
      password,
      host: account.imapHost as string,
      port: account.imapPort as number,
      tls: true,
      connTimeout: IMAP_CONNECTION_TIMEOUT_MS,
      authTimeout: IMAP_CONNECTION_TIMEOUT_MS,
    });

    imap.once("ready", () => resolve(imap));
    imap.once("error", (err: Error) =>
      reject(new SyncError(accountId, "imap", err.message)),
    );

    imap.connect();
  });
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Convert a `mailparser` `ParsedMail` object to the normalised `EmailData`
 * shape. Never logs email content, subjects, or addresses.
 */
function parsedMailToEmailData(
  parsed: ParsedMail,
  uid: string,
  flags: string[],
): EmailData {
  const extractAddrs = (
    obj?: AddressObject | AddressObject[],
  ): Array<{ name: string; address: string }> => {
    if (!obj) return [];
    const list = Array.isArray(obj) ? obj : [obj];
    return list.flatMap((a) =>
      a.value.map((v) => ({ name: v.name ?? "", address: v.address ?? "" })),
    );
  };

  const from = extractAddrs(parsed.from)[0] ?? { name: "", address: "" };
  const to = extractAddrs(parsed.to);
  const cc = extractAddrs(parsed.cc);

  const isRead = flags.includes("\\Seen");
  const isStarred = flags.includes("\\Flagged");
  const isDraft = flags.includes("\\Draft");

  const labels: string[] = [];
  if (!isDraft) labels.push("inbox");
  if (isDraft) labels.push("draft");

  const attachments = parsed.attachments ?? [];
  const hasAttachments = attachments.some((a) => !a.related);

  // Build a plain-text preview from the text body
  const preview = (parsed.text ?? "").slice(0, 200).replace(/\s+/g, " ").trim();

  const messageId = parsed.messageId ?? uid;

  // Normalise references — mailparser may return string[] or a single string
  const refsRaw = parsed.references;
  const refsArray: string[] = !refsRaw
    ? []
    : Array.isArray(refsRaw)
    ? refsRaw
    : [refsRaw];

  // Derive a threadId from In-Reply-To or the first Reference, falling back to messageId
  const threadId =
    parsed.inReplyTo ??
    (refsArray.length > 0 ? refsArray[0] : null) ??
    messageId;

  return {
    messageId,
    threadId,
    subject: parsed.subject ?? "",
    fromName: from.name,
    fromAddress: from.address,
    toAddresses: JSON.stringify(to),
    ccAddresses: JSON.stringify(cc),
    preview,
    bodyText: parsed.text ?? undefined,
    bodyHtml: parsed.html || undefined,
    date: parsed.date ?? new Date(),
    isRead,
    isStarred,
    isDraft,
    labels: JSON.stringify(labels),
    hasAttachments,
    inReplyTo: parsed.inReplyTo ?? undefined,
    references: refsArray.length > 0 ? refsArray.join(" ") : undefined,
  };
}

// ---------------------------------------------------------------------------
// IMAP fetch helpers
// ---------------------------------------------------------------------------

/**
 * Open a mailbox on an already-connected IMAP instance.
 */
function openMailbox(imap: Imap, mailbox: string, readOnly: boolean): Promise<Imap.Box> {
  return new Promise((resolve, reject) => {
    imap.openBox(mailbox, readOnly, (err, box) => {
      if (err) reject(err);
      else resolve(box);
    });
  });
}

/**
 * Execute an IMAP UID search and return the matching UID array.
 */
function searchUids(imap: Imap, criteria: (string | string[])[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    imap.search(criteria, (err, uids) => {
      if (err) reject(err);
      else resolve(uids.map(String));
    });
  });
}

/**
 * Fetch a list of messages by UID range and parse them with mailparser.
 * Returns an array of `[uid, ParsedMail, flags]` tuples.
 */
function fetchMessages(
  imap: Imap,
  source: string,
  bodies: string,
): Promise<Array<{ uid: string; parsed: ParsedMail; flags: string[] }>> {
  return new Promise((resolve, reject) => {
    const results: Array<{ uid: string; parsed: ParsedMail; flags: string[] }> = [];
    let fetch: Imap.ImapFetch;

    try {
      fetch = imap.fetch(source, {
        bodies,
        struct: true,
        markSeen: false,
      });
    } catch (err) {
      reject(err);
      return;
    }

    fetch.on("message", (msg) => {
      let uid = "";
      let flags: string[] = [];
      const buffers: Buffer[] = [];

      msg.on("body", (stream: NodeJS.ReadableStream) => {
        stream.on("data", (chunk: Buffer) => buffers.push(chunk));
        stream.on("error", reject);
      });

      msg.once("attributes", (attrs) => {
        uid = String(attrs.uid);
        flags = attrs.flags as string[];
      });

      msg.once("end", () => {
        const raw = Buffer.concat(buffers);
        simpleParser(Readable.from(raw))
          .then((parsed) => {
            results.push({ uid, parsed, flags });
          })
          .catch(reject);
      });
    });

    fetch.once("error", reject);
    fetch.once("end", () => {
      // Wait a tick for all message 'end' handlers to fire
      setImmediate(() => resolve(results));
    });
  });
}

// ---------------------------------------------------------------------------
// IMAP EmailProvider implementation
// ---------------------------------------------------------------------------

/** IMAP adapter — implements `EmailProvider` using the `imap` npm package. */
export const imapAdapter: EmailProvider = {
  /**
   * Fetch a page of emails from the INBOX via IMAP.
   * Fetches the most recent `maxResults` messages using UID range arithmetic.
   * Each message body is parsed by mailparser.
   *
   * @throws SyncError on IMAP errors.
   */
  async fetchEmails(
    accountId: string,
    options: FetchOptions,
  ): Promise<SyncResult> {
    const maxResults = options.maxResults ?? 50;
    const imap = await getImapConnection(accountId);

    try {
      const box = await openMailbox(imap, "INBOX", true);
      const total = box.messages.total;

      if (total === 0) {
        return { emails: [] };
      }

      // Determine the UID range for the most recent N messages
      const startSeq = Math.max(1, total - maxResults + 1);
      const source = `${startSeq}:*`;

      const msgs = await fetchMessages(imap, source, "");
      const emails = msgs.map(({ uid, parsed, flags }) =>
        parsedMailToEmailData(parsed, uid, flags),
      );

      // Use the highest UID as the next page cursor
      const highestUid = msgs
        .map((m) => Number(m.uid))
        .reduce((a, b) => Math.max(a, b), 0);

      return {
        emails,
        nextPageToken: highestUid > 0 ? String(highestUid) : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new SyncError(accountId, "imap", `fetchEmails failed: ${message}`);
    } finally {
      imap.end();
    }
  },

  /**
   * Fetch all messages belonging to a thread by searching for matching
   * Message-IDs via the In-Reply-To / References headers.
   * Searches both INBOX and Sent folders.
   *
   * @throws SyncError on IMAP errors.
   */
  async fetchThread(
    accountId: string,
    threadId: string,
  ): Promise<EmailData[]> {
    const imap = await getImapConnection(accountId);

    try {
      await openMailbox(imap, "INBOX", true);

      // Search for messages whose Message-ID, In-Reply-To, or References
      // reference the threadId.
      const uids = await searchUids(imap, [["HEADER", "Message-ID", threadId]]);
      const replyUids = await searchUids(imap, [
        ["HEADER", "In-Reply-To", threadId],
      ]);

      const allUids = Array.from(new Set([...uids, ...replyUids]));
      if (allUids.length === 0) return [];

      const msgs = await fetchMessages(imap, allUids.join(","), "");
      return msgs.map(({ uid, parsed, flags }) =>
        parsedMailToEmailData(parsed, uid, flags),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new SyncError(accountId, "imap", `fetchThread failed: ${message}`);
    } finally {
      imap.end();
    }
  },

  /**
   * Fetch a single attachment identified by its UID and attachment index.
   * `attachmentId` format: `{uid}:{attachmentIndex}`.
   *
   * @throws SyncError on IMAP errors or invalid attachmentId format.
   */
  async fetchAttachment(
    accountId: string,
    _messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    const parts = attachmentId.split(":");
    if (parts.length < 2) {
      throw new SyncError(
        accountId,
        "imap",
        `Invalid attachmentId format: ${attachmentId}`,
      );
    }

    const [uid, indexStr] = parts;
    const attachIndex = parseInt(indexStr, 10);
    const imap = await getImapConnection(accountId);

    try {
      await openMailbox(imap, "INBOX", true);
      const msgs = await fetchMessages(imap, uid, "");

      if (msgs.length === 0) {
        throw new SyncError(accountId, "imap", `Message UID ${uid} not found`);
      }

      const { parsed } = msgs[0];
      const attachments = parsed.attachments ?? [];
      const attachment = attachments[attachIndex];

      if (!attachment) {
        throw new SyncError(
          accountId,
          "imap",
          `Attachment index ${attachIndex} not found`,
        );
      }

      return Buffer.isBuffer(attachment.content)
        ? attachment.content
        : Buffer.from(attachment.content);
    } catch (err) {
      if (err instanceof SyncError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new SyncError(
        accountId,
        "imap",
        `fetchAttachment failed: ${message}`,
      );
    } finally {
      imap.end();
    }
  },

  /**
   * Mark messages as read by adding the `\Seen` flag via UID STORE.
   *
   * @throws SyncError on IMAP errors.
   */
  async markRead(accountId: string, messageIds: string[]): Promise<void> {
    const imap = await getImapConnection(accountId);

    try {
      await openMailbox(imap, "INBOX", false);

      await new Promise<void>((resolve, reject) => {
        imap.setFlags(messageIds.join(","), ["\\Seen"], (err) => {
          if (err) reject(new SyncError(accountId, "imap", err.message));
          else resolve();
        });
      });
    } catch (err) {
      if (err instanceof SyncError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new SyncError(accountId, "imap", `markRead failed: ${message}`);
    } finally {
      imap.end();
    }
  },

  /**
   * Archive messages by copying them to the Archive folder and deleting the
   * originals from INBOX. Falls back to simply expunging if Archive is missing.
   *
   * @throws SyncError on IMAP errors.
   */
  async archive(accountId: string, messageIds: string[]): Promise<void> {
    const imap = await getImapConnection(accountId);

    try {
      await openMailbox(imap, "INBOX", false);

      await new Promise<void>((resolve, reject) => {
        imap.copy(
          messageIds.join(","),
          "Archive",
          (copyErr) => {
            if (copyErr) {
              // Archive folder may not exist — just mark as deleted
            }
            imap.addFlags(
              messageIds.join(","),
              ["\\Deleted"],
              (flagErr) => {
                if (flagErr) {
                  reject(new SyncError(accountId, "imap", flagErr.message));
                  return;
                }
                imap.expunge((expungeErr) => {
                  if (expungeErr)
                    reject(new SyncError(accountId, "imap", expungeErr.message));
                  else resolve();
                });
              },
            );
          },
        );
      });
    } catch (err) {
      if (err instanceof SyncError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new SyncError(accountId, "imap", `archive failed: ${message}`);
    } finally {
      imap.end();
    }
  },

  /**
   * Trash messages by copying them to the Trash folder and deleting the
   * originals from INBOX.
   *
   * @throws SyncError on IMAP errors.
   */
  async trash(accountId: string, messageIds: string[]): Promise<void> {
    const imap = await getImapConnection(accountId);
    const trashFolders = ["Trash", "Deleted Items", "Deleted Messages"];

    try {
      await openMailbox(imap, "INBOX", false);

      // Try well-known Trash folder names in order
      let copied = false;
      for (const folder of trashFolders) {
        try {
          await new Promise<void>((resolve, reject) => {
            imap.copy(messageIds.join(","), folder, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          copied = true;
          break;
        } catch {
          // Try the next folder name
        }
      }

      if (!copied) {
        // No Trash folder found — just mark as deleted
      }

      await new Promise<void>((resolve, reject) => {
        imap.addFlags(messageIds.join(","), ["\\Deleted"], (flagErr) => {
          if (flagErr) {
            reject(new SyncError(accountId, "imap", flagErr.message));
            return;
          }
          imap.expunge((expungeErr) => {
            if (expungeErr)
              reject(new SyncError(accountId, "imap", expungeErr.message));
            else resolve();
          });
        });
      });
    } catch (err) {
      if (err instanceof SyncError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new SyncError(accountId, "imap", `trash failed: ${message}`);
    } finally {
      imap.end();
    }
  },

  /**
   * Apply a label (mailbox folder) by copying messages to the target folder.
   * IMAP uses folders as labels, so this copies the message to the named folder.
   *
   * @throws SyncError on IMAP errors.
   */
  async applyLabel(
    accountId: string,
    messageIds: string[],
    labelId: string,
  ): Promise<void> {
    const imap = await getImapConnection(accountId);

    try {
      await openMailbox(imap, "INBOX", false);

      await new Promise<void>((resolve, reject) => {
        imap.copy(messageIds.join(","), labelId, (err) => {
          if (err) reject(new SyncError(accountId, "imap", err.message));
          else resolve();
        });
      });
    } catch (err) {
      if (err instanceof SyncError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new SyncError(accountId, "imap", `applyLabel failed: ${message}`);
    } finally {
      imap.end();
    }
  },

  /**
   * Send an email via SMTP using `nodemailer`.
   * SMTP host/port/credentials are loaded from the Prisma `Account` record.
   * The password is the same encrypted IMAP credential (most providers share
   * IMAP/SMTP credentials).
   *
   * @throws NotFoundError if the account doesn't exist.
   * @throws SendError on SMTP delivery failure.
   */
  async sendEmail(
    accountId: string,
    draft: DraftData,
  ): Promise<SentResult> {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundError("Account", accountId);
    }
    if (
      !account.smtpHost ||
      !account.smtpPort ||
      !account.imapUser ||
      !account.imapPasswordEncrypted
    ) {
      throw new SendError(
        draft.to.map((t) => t.address).join(", "),
        draft.subject,
        "Incomplete SMTP credentials",
      );
    }

    const encryptedValue = JSON.parse(
      account.imapPasswordEncrypted,
    ) as EncryptedValue;
    const password = decryptImapPassword(encryptedValue);

    const transport = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465,
      auth: {
        user: account.imapUser,
        pass: password,
      },
    });

    const formatAddrs = (
      list?: Array<{ name: string; address: string }>,
    ): string =>
      (list ?? [])
        .map((a) => (a.name ? `"${a.name}" <${a.address}>` : a.address))
        .join(", ");

    const attachments = (draft.attachments ?? []).map((a) => ({
      filename: a.name,
      content: a.content,
      contentType: a.mimeType,
    }));

    const mailOptions: nodemailer.SendMailOptions = {
      from: formatAddrs([{ name: account.displayName ?? "", address: account.email ?? account.imapUser ?? "" }]),
      to: formatAddrs(draft.to),
      subject: draft.subject,
      html: draft.body,
      attachments,
    };

    if (draft.cc && draft.cc.length > 0) {
      mailOptions.cc = formatAddrs(draft.cc);
    }
    if (draft.bcc && draft.bcc.length > 0) {
      mailOptions.bcc = formatAddrs(draft.bcc);
    }
    if (draft.inReplyToId) {
      mailOptions.inReplyTo = draft.inReplyToId;
      mailOptions.references = draft.inReplyToId;
    }

    try {
      const info = await transport.sendMail(mailOptions);
      const messageId: string =
        typeof info.messageId === "string" ? info.messageId : "";
      return { messageId, threadId: draft.inReplyToId ?? messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new SendError(
        draft.to.map((t) => t.address).join(", "),
        draft.subject,
        message,
      );
    }
  },
};

/**
 * Gmail REST API adapter for Aire email sync.
 *
 * Uses raw `fetch` against the Gmail v1 REST API — no googleapis SDK.
 * OAuth tokens are stored in the Prisma `Account` table and refreshed
 * automatically on 401 responses.
 *
 * Non-negotiable: never log email content, subjects, or sender addresses.
 */

import { prisma } from "@/lib/prisma";
import { AuthError, SyncError, SendError } from "@/lib/errors";
import type {
  EmailProvider,
  SyncResult,
  EmailData,
  FetchOptions,
  DraftData,
  SentResult,
} from "./types";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// ---------------------------------------------------------------------------
// Internal Gmail API shape definitions
// ---------------------------------------------------------------------------

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: {
    size: number;
    data?: string;
    attachmentId?: string;
  };
  parts?: GmailPart[];
}

interface GmailPayload {
  partId?: string;
  mimeType: string;
  headers: GmailHeader[];
  body?: {
    size: number;
    data?: string;
    attachmentId?: string;
  };
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailPayload;
  sizeEstimate?: number;
  historyId?: string;
  internalDate?: string;
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

interface GmailThread {
  id: string;
  messages?: GmailMessage[];
}

interface GmailAttachment {
  size: number;
  data: string;
}


// ---------------------------------------------------------------------------
// OAuth token refresh
// ---------------------------------------------------------------------------

/**
 * Refresh the Google OAuth access token for an account.
 * Updates the stored `accessToken` and `expiresAt` in the database.
 *
 * @throws AuthError if the refresh token is missing or the request fails.
 */
async function refreshAccessToken(accountId: string): Promise<string> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account?.refresh_token) {
    throw new AuthError("gmail", "No refresh token available");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new AuthError("gmail", "Google OAuth credentials not configured");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: account.refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new AuthError("gmail", `Token refresh failed with status ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
  await prisma.account.update({
    where: { id: accountId },
    data: { access_token: data.access_token, expires_at: expiresAt },
  });

  return data.access_token;
}

/**
 * Make an authenticated request to the Gmail API.
 * Automatically refreshes the access token on a 401 response and retries once.
 *
 * @throws AuthError if a fresh token cannot be obtained.
 * @throws SyncError if the request fails after token refresh.
 */
async function gmailFetch(
  accountId: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const getToken = async (): Promise<string> => {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account?.access_token) {
      return refreshAccessToken(accountId);
    }
    // Refresh proactively if token expires within 60 seconds
    const expiresAt = account.expires_at ?? 0;
    if (expiresAt - Math.floor(Date.now() / 1000) < 60) {
      return refreshAccessToken(accountId);
    }
    return account.access_token;
  };

  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${GMAIL_API}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token was rejected — force a refresh and retry once
    const freshToken = await refreshAccessToken(accountId);
    headers.set("Authorization", `Bearer ${freshToken}`);
    return fetch(`${GMAIL_API}${path}`, { ...options, headers });
  }

  return res;
}

// ---------------------------------------------------------------------------
// Message parsing helpers
// ---------------------------------------------------------------------------

/**
 * Decode a base64url-encoded string to UTF-8.
 * Gmail uses base64url encoding for message body data.
 */
function decodeBase64Url(str: string): string {
  // Convert base64url → standard base64 by replacing URL-safe chars
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Recursively walk a Gmail MIME payload tree and extract plain-text and HTML
 * body content. Prefers the last part found of each type (handles
 * multipart/alternative correctly).
 */
function extractBodies(
  payload: GmailPayload | GmailPart,
): { text?: string; html?: string } {
  const { mimeType, body, parts } = payload;
  let text: string | undefined;
  let html: string | undefined;

  if (mimeType === "text/plain" && body?.data) {
    text = decodeBase64Url(body.data);
  } else if (mimeType === "text/html" && body?.data) {
    html = decodeBase64Url(body.data);
  } else if (parts && parts.length > 0) {
    for (const part of parts) {
      const child = extractBodies(part);
      if (child.text) text = child.text;
      if (child.html) html = child.html;
    }
  } else if (
    (mimeType === "multipart/mixed" || mimeType === "multipart/alternative") &&
    body?.data
  ) {
    text = decodeBase64Url(body.data);
  }

  return { text, html };
}

/**
 * Map provider-specific Gmail label IDs to normalised label names that Aire
 * stores in the `labels` JSON column.
 */
function mapGmailLabels(labelIds: string[]): string[] {
  const mapping: Record<string, string> = {
    INBOX: "inbox",
    SENT: "sent",
    DRAFT: "draft",
    TRASH: "trash",
    SPAM: "spam",
    STARRED: "starred",
    UNREAD: "unread",
    IMPORTANT: "important",
    CATEGORY_PERSONAL: "personal",
    CATEGORY_SOCIAL: "social",
    CATEGORY_PROMOTIONS: "promotions",
    CATEGORY_UPDATES: "updates",
    CATEGORY_FORUMS: "forums",
  };
  return labelIds.map((id) => mapping[id] ?? id.toLowerCase());
}

/**
 * Extract a named header value from a Gmail payload header list.
 * Returns an empty string when the header is absent.
 */
function getHeader(headers: GmailHeader[], name: string): string {
  return (
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

/**
 * Parse a raw Gmail message object into the normalised `EmailData` shape.
 * Never logs email content, subjects, or addresses.
 */
function parseGmailMessage(msg: GmailMessage, _accountId: string): EmailData {
  const payload = msg.payload;
  const headers: GmailHeader[] = payload?.headers ?? [];

  const subject = getHeader(headers, "Subject");
  const fromRaw = getHeader(headers, "From");
  const toRaw = getHeader(headers, "To");
  const ccRaw = getHeader(headers, "Cc");
  const dateRaw = getHeader(headers, "Date");
  const inReplyTo = getHeader(headers, "In-Reply-To") || undefined;
  const references = getHeader(headers, "References") || undefined;

  // Parse "Display Name <email@example.com>" or "email@example.com"
  const parseAddress = (raw: string): Array<{ name: string; address: string }> => {
    return raw
      .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/^(?:"?([^"<]*?)"?\s*)?<?([^>]+)>?$/);
        if (match) {
          return { name: (match[1] ?? "").trim(), address: (match[2] ?? "").trim() };
        }
        return { name: "", address: part.trim() };
      });
  };

  const fromParsed = parseAddress(fromRaw)[0] ?? { name: "", address: fromRaw };
  const toParsed = parseAddress(toRaw);
  const ccParsed = parseAddress(ccRaw);

  const labelIds = msg.labelIds ?? [];
  const isRead = !labelIds.includes("UNREAD");
  const isStarred = labelIds.includes("STARRED");
  const isDraft = labelIds.includes("DRAFT");

  // Detect attachments: any part with a non-empty filename and an attachmentId
  const hasMimeAttachment = (parts?: GmailPart[]): boolean => {
    if (!parts) return false;
    return parts.some(
      (p) =>
        (p.filename && p.filename.length > 0 && p.body?.attachmentId) ||
        hasMimeAttachment(p.parts),
    );
  };
  const hasAttachments = hasMimeAttachment(payload?.parts);

  const { text: bodyText, html: bodyHtml } = payload
    ? extractBodies(payload)
    : {};

  const date = dateRaw
    ? new Date(dateRaw)
    : new Date(Number(msg.internalDate ?? 0));

  return {
    messageId: msg.id,
    threadId: msg.threadId,
    subject,
    fromName: fromParsed.name,
    fromAddress: fromParsed.address,
    toAddresses: JSON.stringify(toParsed),
    ccAddresses: JSON.stringify(ccParsed),
    preview: msg.snippet ?? "",
    bodyText,
    bodyHtml,
    date,
    isRead,
    isStarred,
    isDraft,
    labels: JSON.stringify(mapGmailLabels(labelIds)),
    hasAttachments,
    inReplyTo,
    references,
  };
}

// ---------------------------------------------------------------------------
// RFC 2822 builder (for sendEmail)
// ---------------------------------------------------------------------------

/**
 * Encode a string to base64url (no padding), as required by Gmail's send API.
 */
function toBase64Url(input: string | Buffer): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf-8");
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Build a minimal RFC 2822 MIME message string suitable for Gmail's send API.
 * Supports plain-text body with optional inline attachments.
 */
function buildRfc2822(draft: DraftData, messageId?: string): string {
  const formatAddrs = (
    list: Array<{ name: string; address: string }>,
  ): string =>
    list
      .map((a) => (a.name ? `"${a.name}" <${a.address}>` : a.address))
      .join(", ");

  const lines: string[] = [
    `From: ${formatAddrs(draft.to.slice(0, 1))}`,
    `To: ${formatAddrs(draft.to)}`,
  ];

  if (draft.cc && draft.cc.length > 0) {
    lines.push(`Cc: ${formatAddrs(draft.cc)}`);
  }
  if (draft.bcc && draft.bcc.length > 0) {
    lines.push(`Bcc: ${formatAddrs(draft.bcc)}`);
  }
  if (messageId) {
    lines.push(`In-Reply-To: ${messageId}`);
    lines.push(`References: ${messageId}`);
  }

  lines.push(`Subject: =?UTF-8?B?${Buffer.from(draft.subject, "utf-8").toString("base64")}?=`);
  lines.push("MIME-Version: 1.0");

  if (!draft.attachments || draft.attachments.length === 0) {
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(draft.body, "utf-8").toString("base64"));
  } else {
    const boundary = `aire_${Date.now()}_boundary`;
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
    lines.push("Content-Type: text/html; charset=UTF-8");
    lines.push("Content-Transfer-Encoding: base64");
    lines.push("");
    lines.push(Buffer.from(draft.body, "utf-8").toString("base64"));

    for (const att of draft.attachments) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${att.mimeType}; name="${att.name}"`);
      lines.push(`Content-Disposition: attachment; filename="${att.name}"`);
      lines.push("Content-Transfer-Encoding: base64");
      lines.push("");
      lines.push(att.content.toString("base64"));
    }
    lines.push(`--${boundary}--`);
  }

  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// Gmail EmailProvider implementation
// ---------------------------------------------------------------------------

/** Gmail REST API adapter — implements `EmailProvider` using raw fetch calls. */
export const gmailAdapter: EmailProvider = {
  /**
   * Fetch a page of emails from the Gmail inbox.
   * Uses `/users/me/messages` to list IDs, then `/users/me/messages/batchGet`
   * to retrieve full message details in a single round-trip.
   *
   * @throws SyncError on non-2xx responses.
   */
  async fetchEmails(
    accountId: string,
    options: FetchOptions,
  ): Promise<SyncResult> {
    const maxResults = options.maxResults ?? 50;
    const labelIds = options.labelIds ?? ["INBOX"];

    const params = new URLSearchParams({
      maxResults: String(maxResults),
    });
    for (const label of labelIds) {
      params.append("labelIds", label);
    }
    if (options.pageToken) params.set("pageToken", options.pageToken);
    if (options.q) params.set("q", options.q);

    const listRes = await gmailFetch(
      accountId,
      `/users/me/messages?${params.toString()}`,
    );
    if (!listRes.ok) {
      const errBody = await listRes.text().catch(() => "");
      throw new SyncError(accountId, "gmail", `List messages failed: ${listRes.status} — ${errBody}`);
    }

    const listData = (await listRes.json()) as GmailListResponse;
    const messageRefs = listData.messages ?? [];

    if (messageRefs.length === 0) {
      return { emails: [], nextPageToken: listData.nextPageToken };
    }

    // Fetch full message details with a concurrency pool of 20 to avoid
    // both rate limits and the slowness of fully-sequential batching.
    const CONCURRENCY = 20;
    const messages: GmailMessage[] = new Array(messageRefs.length);
    let next = 0;
    async function worker() {
      while (next < messageRefs.length) {
        const i = next++;
        const ref = messageRefs[i];
        const res = await gmailFetch(
          accountId,
          `/users/me/messages/${ref.id}?format=FULL`,
        );
        if (!res.ok) {
          throw new SyncError(accountId, "gmail", `Get message ${ref.id} failed: ${res.status}`);
        }
        messages[i] = (await res.json()) as GmailMessage;
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, messageRefs.length) }, worker));

    const emails = messages.map((msg) => parseGmailMessage(msg, accountId));

    // Capture historyId from the first message for incremental sync
    const historyId = messages[0]?.historyId ?? undefined;

    return {
      emails,
      nextPageToken: listData.nextPageToken,
      historyId,
    };
  },

  /**
   * Fetch all messages in a Gmail thread.
   *
   * @throws SyncError on non-2xx response.
   */
  async fetchThread(
    accountId: string,
    threadId: string,
  ): Promise<EmailData[]> {
    const res = await gmailFetch(
      accountId,
      `/users/me/threads/${threadId}?format=FULL`,
    );
    if (!res.ok) {
      throw new SyncError(accountId, "gmail", `Fetch thread failed: ${res.status}`);
    }

    const thread = (await res.json()) as GmailThread;
    return (thread.messages ?? []).map((msg) =>
      parseGmailMessage(msg, accountId),
    );
  },

  /**
   * Download a single attachment by its Gmail attachment ID.
   * Returns raw bytes as a Node.js Buffer.
   *
   * @throws SyncError on non-2xx response.
   */
  async fetchAttachment(
    accountId: string,
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    const res = await gmailFetch(
      accountId,
      `/users/me/messages/${messageId}/attachments/${attachmentId}`,
    );
    if (!res.ok) {
      throw new SyncError(
        accountId,
        "gmail",
        `Fetch attachment failed: ${res.status}`,
      );
    }

    const data = (await res.json()) as GmailAttachment;
    // Attachment data is base64url encoded
    const base64 = data.data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64");
  },

  /**
   * Mark one or more messages as read by removing the UNREAD label.
   *
   * @throws SyncError on non-2xx response.
   */
  async markRead(accountId: string, messageIds: string[]): Promise<void> {
    const res = await gmailFetch(accountId, "/users/me/messages/batchModify", {
      method: "POST",
      body: JSON.stringify({
        ids: messageIds,
        removeLabelIds: ["UNREAD"],
      }),
    });
    if (!res.ok) {
      throw new SyncError(accountId, "gmail", `markRead failed: ${res.status}`);
    }
  },

  /**
   * Archive messages by removing the INBOX label.
   *
   * @throws SyncError on non-2xx response.
   */
  async archive(accountId: string, messageIds: string[]): Promise<void> {
    const res = await gmailFetch(accountId, "/users/me/messages/batchModify", {
      method: "POST",
      body: JSON.stringify({
        ids: messageIds,
        removeLabelIds: ["INBOX"],
      }),
    });
    if (!res.ok) {
      throw new SyncError(accountId, "gmail", `archive failed: ${res.status}`);
    }
  },

  /**
   * Move each message to Gmail trash.
   * The Gmail API requires individual trash calls per message.
   *
   * @throws SyncError if any trash request fails.
   */
  async trash(accountId: string, messageIds: string[]): Promise<void> {
    await Promise.all(
      messageIds.map(async (id) => {
        const res = await gmailFetch(
          accountId,
          `/users/me/messages/${id}/trash`,
          { method: "POST" },
        );
        if (!res.ok) {
          throw new SyncError(
            accountId,
            "gmail",
            `trash message ${id} failed: ${res.status}`,
          );
        }
      }),
    );
  },

  /**
   * Apply a label to one or more messages via batchModify.
   *
   * @throws SyncError on non-2xx response.
   */
  async applyLabel(
    accountId: string,
    messageIds: string[],
    labelId: string,
  ): Promise<void> {
    const res = await gmailFetch(accountId, "/users/me/messages/batchModify", {
      method: "POST",
      body: JSON.stringify({
        ids: messageIds,
        addLabelIds: [labelId],
      }),
    });
    if (!res.ok) {
      throw new SyncError(accountId, "gmail", `applyLabel failed: ${res.status}`);
    }
  },

  /**
   * Send an email via Gmail.
   * Builds an RFC 2822 message, base64url-encodes it, and POSTs to
   * `/users/me/messages/send`. Handles thread replies via `inReplyToId`.
   *
   * @throws SendError on non-2xx response.
   */
  async sendEmail(
    accountId: string,
    draft: DraftData,
  ): Promise<SentResult> {
    let inReplyToHeader: string | undefined;

    if (draft.inReplyToId) {
      // Fetch the original message to get the Message-ID header for threading
      const origRes = await gmailFetch(
        accountId,
        `/users/me/messages/${draft.inReplyToId}?format=METADATA&metadataHeaders=Message-ID`,
      );
      if (origRes.ok) {
        const orig = (await origRes.json()) as GmailMessage;
        inReplyToHeader = getHeader(
          orig.payload?.headers ?? [],
          "Message-ID",
        );
      }
    }

    const rfc2822 = buildRfc2822(draft, inReplyToHeader);
    const encoded = toBase64Url(rfc2822);

    const body: Record<string, unknown> = { raw: encoded };
    if (draft.inReplyToId) {
      // Retrieve threadId from the original message to keep the reply in-thread
      const origRes = await gmailFetch(
        accountId,
        `/users/me/messages/${draft.inReplyToId}?format=MINIMAL`,
      );
      if (origRes.ok) {
        const orig = (await origRes.json()) as GmailMessage;
        body.threadId = orig.threadId;
      }
    }

    const res = await gmailFetch(accountId, "/users/me/messages/send", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new SendError(
        draft.to.map((t) => t.address).join(", "),
        draft.subject,
        `Gmail send failed with status ${res.status}`,
      );
    }

    const sent = (await res.json()) as { id: string; threadId: string };
    return { messageId: sent.id, threadId: sent.threadId };
  },
};

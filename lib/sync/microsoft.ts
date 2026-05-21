/**
 * Microsoft Graph API adapter for Pmail email sync.
 *
 * Uses raw `fetch` against the Microsoft Graph v1.0 REST API.
 * Supports delta sync via `@odata.deltaLink` for incremental updates.
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

const GRAPH_API = "https://graph.microsoft.com/v1.0";
const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

// ---------------------------------------------------------------------------
// Internal Microsoft Graph shape definitions
// ---------------------------------------------------------------------------

interface GraphEmailAddress {
  name: string;
  address: string;
}

interface GraphRecipient {
  emailAddress: GraphEmailAddress;
}

interface GraphBodyContent {
  contentType: "text" | "html";
  content: string;
}

interface GraphMessage {
  id: string;
  conversationId: string;
  subject?: string;
  bodyPreview?: string;
  body?: GraphBodyContent;
  sender?: GraphRecipient;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  bccRecipients?: GraphRecipient[];
  receivedDateTime?: string;
  sentDateTime?: string;
  isRead?: boolean;
  isDraft?: boolean;
  flag?: { flagStatus: "notFlagged" | "flagged" | "complete" };
  hasAttachments?: boolean;
  internetMessageId?: string;
  inReplyTo?: string;
  categories?: string[];
  "@odata.etag"?: string;
}

interface GraphListResponse {
  value: GraphMessage[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

interface GraphAttachment {
  "@odata.type": string;
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  /** Base64-encoded content (only present on FileAttachment). */
  contentBytes?: string;
}

// ---------------------------------------------------------------------------
// OAuth token refresh
// ---------------------------------------------------------------------------

/**
 * Refresh the Microsoft OAuth access token for an account.
 * Updates `accessToken` and `expiresAt` in the Prisma `Account` table.
 *
 * @throws AuthError if the refresh token is missing or the request fails.
 */
async function refreshMicrosoftToken(accountId: string): Promise<string> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account?.refresh_token) {
    throw new AuthError("office365", "No refresh token available");
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new AuthError("office365", "Microsoft OAuth credentials not configured");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: account.refresh_token,
    grant_type: "refresh_token",
    scope: "https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access",
  });

  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new AuthError(
      "office365",
      `Token refresh failed with status ${res.status}`,
    );
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
 * Make an authenticated request to the Microsoft Graph API.
 * Auto-refreshes the access token on 401 and retries once.
 *
 * @throws AuthError if a fresh token cannot be obtained.
 * @throws SyncError on repeated failure.
 */
async function graphFetch(
  accountId: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const getToken = async (): Promise<string> => {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account?.access_token) {
      return refreshMicrosoftToken(accountId);
    }
    const expiresAt = account.expires_at ?? 0;
    if (expiresAt - Math.floor(Date.now() / 1000) < 60) {
      return refreshMicrosoftToken(accountId);
    }
    return account.access_token;
  };

  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  // Only set Content-Type for requests that carry a body
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = path.startsWith("https://") ? path : `${GRAPH_API}${path}`;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const freshToken = await refreshMicrosoftToken(accountId);
    headers.set("Authorization", `Bearer ${freshToken}`);
    return fetch(url, { ...options, headers });
  }

  return res;
}

// ---------------------------------------------------------------------------
// Message parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse a Microsoft Graph message object into the normalised `EmailData` shape.
 * Never logs email content, subjects, or addresses.
 */
function parseGraphMessage(msg: GraphMessage): EmailData {
  const from = msg.from ?? msg.sender;
  const fromName = from?.emailAddress.name ?? "";
  const fromAddress = from?.emailAddress.address ?? "";

  const mapRecipients = (
    list?: GraphRecipient[],
  ): Array<{ name: string; address: string }> =>
    (list ?? []).map((r) => ({
      name: r.emailAddress.name,
      address: r.emailAddress.address,
    }));

  const toParsed = mapRecipients(msg.toRecipients);
  const ccParsed = mapRecipients(msg.ccRecipients);

  const bodyText =
    msg.body?.contentType === "text" ? msg.body.content : undefined;
  const bodyHtml =
    msg.body?.contentType === "html" ? msg.body.content : undefined;

  const date = msg.receivedDateTime
    ? new Date(msg.receivedDateTime)
    : msg.sentDateTime
    ? new Date(msg.sentDateTime)
    : new Date();

  const labels: string[] = [];
  if (!msg.isDraft) labels.push("inbox");
  if (msg.isDraft) labels.push("draft");
  if (msg.categories) labels.push(...msg.categories.map((c) => c.toLowerCase()));

  return {
    messageId: msg.id,
    threadId: msg.conversationId,
    subject: msg.subject ?? "",
    fromName,
    fromAddress,
    toAddresses: JSON.stringify(toParsed),
    ccAddresses: JSON.stringify(ccParsed),
    preview: msg.bodyPreview ?? "",
    bodyText,
    bodyHtml,
    date,
    isRead: msg.isRead ?? false,
    isStarred: msg.flag?.flagStatus === "flagged",
    isDraft: msg.isDraft ?? false,
    labels: JSON.stringify(labels),
    hasAttachments: msg.hasAttachments ?? false,
    inReplyTo: msg.inReplyTo ?? undefined,
    references: undefined,
  };
}

// ---------------------------------------------------------------------------
// Graph EmailProvider implementation
// ---------------------------------------------------------------------------

/**
 * $select fields requested for every message fetch.
 * Keeping the field list narrow reduces payload size.
 */
const MESSAGE_SELECT = [
  "id",
  "conversationId",
  "subject",
  "bodyPreview",
  "body",
  "from",
  "sender",
  "toRecipients",
  "ccRecipients",
  "receivedDateTime",
  "sentDateTime",
  "isRead",
  "isDraft",
  "flag",
  "hasAttachments",
  "internetMessageId",
  "inReplyTo",
  "categories",
].join(",");

/** Microsoft Graph API adapter — implements `EmailProvider` using raw fetch. */
export const microsoftAdapter: EmailProvider = {
  /**
   * Fetch a page of emails from the Graph mailbox.
   * Uses delta sync (`@odata.deltaLink`) when `options.incremental` is true
   * and a stored delta link is available. Falls back to a full list otherwise.
   *
   * @throws SyncError on non-2xx responses.
   */
  async fetchEmails(
    accountId: string,
    options: FetchOptions,
  ): Promise<SyncResult> {
    const top = options.maxResults ?? 50;

    let url: string;

    if (options.incremental) {
      // Retrieve stored delta link for this account
      const syncState = await prisma.syncState.findUnique({
        where: { accountId },
      });
      if (syncState?.deltaLink) {
        // Use the stored delta link directly — it encodes all query params
        url = syncState.deltaLink;
      } else {
        // Bootstrap delta sync from scratch
        url = `${GRAPH_API}/me/mailFolders/inbox/messages/delta?$select=${MESSAGE_SELECT}&$top=${top}`;
      }
    } else {
      const params = new URLSearchParams({
        $select: MESSAGE_SELECT,
        $top: String(top),
        $orderby: "receivedDateTime desc",
      });
      if (options.pageToken) params.set("$skiptoken", options.pageToken);
      if (options.q) params.set("$search", `"${options.q}"`);
      url = `${GRAPH_API}/me/messages?${params.toString()}`;
    }

    const res = await graphFetch(accountId, url);
    if (!res.ok) {
      throw new SyncError(
        accountId,
        "office365",
        `Fetch messages failed: ${res.status}`,
      );
    }

    const data = (await res.json()) as GraphListResponse;
    const emails = data.value.map(parseGraphMessage);

    // Extract next-page token from @odata.nextLink
    let nextPageToken: string | undefined;
    if (data["@odata.nextLink"]) {
      const skipMatch = data["@odata.nextLink"].match(/\$skiptoken=([^&]+)/);
      nextPageToken = skipMatch ? decodeURIComponent(skipMatch[1]) : undefined;
    }

    return {
      emails,
      nextPageToken,
      deltaLink: data["@odata.deltaLink"],
    };
  },

  /**
   * Fetch all messages in a conversation (thread) by conversationId.
   * Uses `$filter=conversationId eq '...'` on the messages endpoint.
   *
   * @throws SyncError on non-2xx response.
   */
  async fetchThread(
    accountId: string,
    threadId: string,
  ): Promise<EmailData[]> {
    const params = new URLSearchParams({
      $select: MESSAGE_SELECT,
      $filter: `conversationId eq '${threadId}'`,
      $orderby: "receivedDateTime asc",
    });
    const res = await graphFetch(
      accountId,
      `/me/messages?${params.toString()}`,
    );
    if (!res.ok) {
      throw new SyncError(
        accountId,
        "office365",
        `Fetch thread failed: ${res.status}`,
      );
    }

    const data = (await res.json()) as { value: GraphMessage[] };
    return data.value.map(parseGraphMessage);
  },

  /**
   * Download a single attachment by its Graph attachment ID.
   * Returns raw bytes decoded from the base64-encoded `contentBytes` field.
   *
   * @throws SyncError on non-2xx response or missing content.
   */
  async fetchAttachment(
    accountId: string,
    messageId: string,
    attachmentId: string,
  ): Promise<Buffer> {
    const res = await graphFetch(
      accountId,
      `/me/messages/${messageId}/attachments/${attachmentId}`,
    );
    if (!res.ok) {
      throw new SyncError(
        accountId,
        "office365",
        `Fetch attachment failed: ${res.status}`,
      );
    }

    const data = (await res.json()) as GraphAttachment;
    if (!data.contentBytes) {
      throw new SyncError(
        accountId,
        "office365",
        "Attachment has no contentBytes",
      );
    }
    return Buffer.from(data.contentBytes, "base64");
  },

  /**
   * Mark messages as read by PATCHing `isRead: true` for each message.
   *
   * @throws SyncError if any individual PATCH fails.
   */
  async markRead(accountId: string, messageIds: string[]): Promise<void> {
    await Promise.all(
      messageIds.map(async (id) => {
        const res = await graphFetch(accountId, `/me/messages/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ isRead: true }),
        });
        if (!res.ok) {
          throw new SyncError(
            accountId,
            "office365",
            `markRead for ${id} failed: ${res.status}`,
          );
        }
      }),
    );
  },

  /**
   * Archive messages by moving them to the Archive folder.
   * Uses the well-known folder name `archive`.
   *
   * @throws SyncError if any move fails.
   */
  async archive(accountId: string, messageIds: string[]): Promise<void> {
    await Promise.all(
      messageIds.map(async (id) => {
        const res = await graphFetch(accountId, `/me/messages/${id}/move`, {
          method: "POST",
          body: JSON.stringify({ destinationId: "archive" }),
        });
        if (!res.ok) {
          throw new SyncError(
            accountId,
            "office365",
            `archive message ${id} failed: ${res.status}`,
          );
        }
      }),
    );
  },

  /**
   * Move messages to the deleted-items (trash) folder.
   *
   * @throws SyncError if any move fails.
   */
  async trash(accountId: string, messageIds: string[]): Promise<void> {
    await Promise.all(
      messageIds.map(async (id) => {
        const res = await graphFetch(accountId, `/me/messages/${id}/move`, {
          method: "POST",
          body: JSON.stringify({ destinationId: "deleteditems" }),
        });
        if (!res.ok) {
          throw new SyncError(
            accountId,
            "office365",
            `trash message ${id} failed: ${res.status}`,
          );
        }
      }),
    );
  },

  /**
   * Apply a category label to one or more messages.
   * Appends `labelId` to the existing `categories` array to avoid overwriting
   * other categories already set on the message.
   *
   * @throws SyncError if any PATCH fails.
   */
  async applyLabel(
    accountId: string,
    messageIds: string[],
    labelId: string,
  ): Promise<void> {
    await Promise.all(
      messageIds.map(async (id) => {
        // Fetch existing categories first
        const getRes = await graphFetch(
          accountId,
          `/me/messages/${id}?$select=categories`,
        );
        const existing: string[] = getRes.ok
          ? ((await getRes.json()) as { categories?: string[] }).categories ?? []
          : [];

        if (!existing.includes(labelId)) {
          existing.push(labelId);
        }

        const patchRes = await graphFetch(accountId, `/me/messages/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ categories: existing }),
        });
        if (!patchRes.ok) {
          throw new SyncError(
            accountId,
            "office365",
            `applyLabel for ${id} failed: ${patchRes.status}`,
          );
        }
      }),
    );
  },

  /**
   * Send an email via Microsoft Graph.
   * POSTs to `/me/sendMail` with a JSON message body.
   *
   * @throws SendError on non-2xx response.
   */
  async sendEmail(
    accountId: string,
    draft: DraftData,
  ): Promise<SentResult> {
    const mapAddrs = (
      list?: Array<{ name: string; address: string }>,
    ): GraphRecipient[] =>
      (list ?? []).map((a) => ({
        emailAddress: { name: a.name, address: a.address },
      }));

    const message: Record<string, unknown> = {
      subject: draft.subject,
      body: { contentType: "html", content: draft.body },
      toRecipients: mapAddrs(draft.to),
    };

    if (draft.cc && draft.cc.length > 0) {
      message.ccRecipients = mapAddrs(draft.cc);
    }
    if (draft.bcc && draft.bcc.length > 0) {
      message.bccRecipients = mapAddrs(draft.bcc);
    }

    if (draft.attachments && draft.attachments.length > 0) {
      message.attachments = draft.attachments.map((a) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: a.name,
        contentType: a.mimeType,
        contentBytes: a.content.toString("base64"),
      }));
    }

    // If this is a reply, create a draft reply and then send it to preserve
    // conversation threading via the Graph conversation model
    if (draft.inReplyToId) {
      const replyDraftRes = await graphFetch(
        accountId,
        `/me/messages/${draft.inReplyToId}/createReply`,
        {
          method: "POST",
          body: JSON.stringify({ message }),
        },
      );
      if (!replyDraftRes.ok) {
        throw new SendError(
          draft.to.map((t) => t.address).join(", "),
          draft.subject,
          `createReply failed with status ${replyDraftRes.status}`,
        );
      }

      const replyDraft = (await replyDraftRes.json()) as { id: string; conversationId: string };

      const sendRes = await graphFetch(
        accountId,
        `/me/messages/${replyDraft.id}/send`,
        { method: "POST" },
      );
      if (!sendRes.ok) {
        throw new SendError(
          draft.to.map((t) => t.address).join(", "),
          draft.subject,
          `send reply failed with status ${sendRes.status}`,
        );
      }

      return {
        messageId: replyDraft.id,
        threadId: replyDraft.conversationId,
      };
    }

    // New message — use /sendMail which sends without creating a sent-items draft first
    const res = await graphFetch(accountId, "/me/sendMail", {
      method: "POST",
      body: JSON.stringify({ message, saveToSentItems: true }),
    });

    if (!res.ok) {
      throw new SendError(
        draft.to.map((t) => t.address).join(", "),
        draft.subject,
        `Graph sendMail failed with status ${res.status}`,
      );
    }

    // sendMail returns 202 Accepted with no body; synthesise IDs from the
    // draft if we can, otherwise return empty strings as a sentinel.
    return { messageId: "", threadId: "" };
  },
};

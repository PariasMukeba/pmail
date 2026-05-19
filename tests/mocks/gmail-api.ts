import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

/** Minimal Gmail message resource shape. */
export function makeGmailMessage(overrides: Record<string, unknown> = {}) {
  const id = faker.string.alphanumeric(16);
  return {
    id,
    threadId: faker.string.alphanumeric(16),
    labelIds: ["INBOX", "UNREAD"],
    snippet: faker.lorem.sentence(),
    internalDate: String(Date.now()),
    payload: {
      headers: [
        { name: "From", value: faker.internet.email() },
        { name: "To", value: faker.internet.email() },
        { name: "Subject", value: faker.lorem.sentence() },
        { name: "Date", value: new Date().toUTCString() },
        { name: "Message-ID", value: `<${faker.string.alphanumeric(16)}@gmail.com>` },
      ],
      mimeType: "text/plain",
      body: {
        data: Buffer.from(faker.lorem.paragraphs(2)).toString("base64url"),
      },
    },
    ...overrides,
  };
}

export const gmailHandlers = [
  // Token refresh
  http.post(OAUTH_TOKEN_URL, () =>
    HttpResponse.json({
      access_token: faker.string.alphanumeric(64),
      expires_in: 3600,
      token_type: "Bearer",
      scope: "https://www.googleapis.com/auth/gmail.modify",
    }),
  ),

  // List messages
  http.get(`${GMAIL_BASE}/messages`, ({ request }) => {
    const url = new URL(request.url);
    const maxResults = Number(url.searchParams.get("maxResults") ?? 20);
    const messages = Array.from({ length: Math.min(maxResults, 5) }, () => ({
      id: faker.string.alphanumeric(16),
      threadId: faker.string.alphanumeric(16),
    }));
    return HttpResponse.json({ messages, resultSizeEstimate: messages.length });
  }),

  // Get single message
  http.get(`${GMAIL_BASE}/messages/:id`, () =>
    HttpResponse.json(makeGmailMessage()),
  ),

  // List threads
  http.get(`${GMAIL_BASE}/threads`, () =>
    HttpResponse.json({
      threads: [
        { id: faker.string.alphanumeric(16), snippet: faker.lorem.sentence() },
      ],
      resultSizeEstimate: 1,
    }),
  ),

  // Get single thread
  http.get(`${GMAIL_BASE}/threads/:id`, ({ params }) =>
    HttpResponse.json({
      id: params.id,
      messages: [makeGmailMessage({ threadId: params.id })],
    }),
  ),

  // Send message
  http.post(`${GMAIL_BASE}/messages/send`, () =>
    HttpResponse.json({
      id: faker.string.alphanumeric(16),
      threadId: faker.string.alphanumeric(16),
      labelIds: ["SENT"],
    }),
  ),

  // Modify labels (mark read, archive, trash)
  http.post(`${GMAIL_BASE}/messages/:id/modify`, () =>
    HttpResponse.json({ id: faker.string.alphanumeric(16), labelIds: ["INBOX"] }),
  ),

  // History list (incremental sync)
  http.get(`${GMAIL_BASE}/history`, () =>
    HttpResponse.json({
      history: [],
      historyId: faker.string.numeric(8),
    }),
  ),
];

import { http, HttpResponse } from "msw";
import { faker } from "@faker-js/faker";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0/me";
const MS_TOKEN_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";

/** Minimal Microsoft Graph message shape. */
export function makeMsMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.alphanumeric(32),
    conversationId: faker.string.alphanumeric(32),
    subject: faker.lorem.sentence(),
    isRead: false,
    isDraft: false,
    receivedDateTime: new Date().toISOString(),
    from: {
      emailAddress: { name: faker.person.fullName(), address: faker.internet.email() },
    },
    toRecipients: [
      { emailAddress: { name: faker.person.fullName(), address: faker.internet.email() } },
    ],
    ccRecipients: [],
    bccRecipients: [],
    body: {
      contentType: "text",
      content: faker.lorem.paragraphs(2),
    },
    hasAttachments: false,
    internetMessageId: `<${faker.string.alphanumeric(16)}@outlook.com>`,
    inferenceClassification: "focused",
    ...overrides,
  };
}

export const microsoftHandlers = [
  // Token refresh
  http.post(MS_TOKEN_URL, () =>
    HttpResponse.json({
      access_token: faker.string.alphanumeric(64),
      refresh_token: faker.string.alphanumeric(64),
      expires_in: 3600,
      token_type: "Bearer",
      scope: "Mail.ReadWrite offline_access",
    }),
  ),

  // List messages from inbox
  http.get(`${GRAPH_BASE}/mailFolders/inbox/messages`, () =>
    HttpResponse.json({
      value: [makeMsMessage(), makeMsMessage()],
      "@odata.nextLink": undefined,
    }),
  ),

  // List messages (general)
  http.get(`${GRAPH_BASE}/messages`, () =>
    HttpResponse.json({ value: [makeMsMessage()] }),
  ),

  // Get single message
  http.get(`${GRAPH_BASE}/messages/:id`, ({ params }) =>
    HttpResponse.json(makeMsMessage({ id: params.id })),
  ),

  // Update message (mark read, etc.)
  http.patch(`${GRAPH_BASE}/messages/:id`, () =>
    HttpResponse.json(makeMsMessage({ isRead: true })),
  ),

  // Send mail
  http.post(`${GRAPH_BASE}/sendMail`, () => new HttpResponse(null, { status: 202 })),

  // Create draft
  http.post(`${GRAPH_BASE}/messages`, () =>
    HttpResponse.json(makeMsMessage({ isDraft: true }), { status: 201 }),
  ),

  // Move message (archive/trash)
  http.post(`${GRAPH_BASE}/messages/:id/move`, () =>
    HttpResponse.json(makeMsMessage()),
  ),

  // Delta sync
  http.get(`${GRAPH_BASE}/mailFolders/inbox/messages/delta`, () =>
    HttpResponse.json({
      value: [],
      "@odata.deltaLink":
        "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=abc123",
    }),
  ),
];

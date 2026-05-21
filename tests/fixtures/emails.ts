import { faker } from "@faker-js/faker";

// ─── PlainEmail ────────────────────────────────────────────────────────────────
// Pre-encryption shape used in skill tests (parse-mime, extract-thread, etc.)

/** Plaintext email — pre-encryption shape used in skill and handler tests. */
export interface PlainEmail {
  id: string;
  threadId: string;
  accountId: string;
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  textBody: string;
  htmlBody: string | null;
  receivedAt: Date;
  sentAt: Date | null;
  isRead: boolean;
  isDraft: boolean;
  isOutbound: boolean;
  hasAttachments: boolean;
  headers: Record<string, string>;
}

/** Factory for a generic plaintext email. */
export function makeEmail(overrides: Partial<PlainEmail> = {}): PlainEmail {
  return {
    id: faker.string.uuid(),
    threadId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    messageId: `<${faker.string.alphanumeric(16)}@${faker.internet.domainName()}>`,
    inReplyTo: null,
    references: [],
    from: faker.internet.email(),
    to: [faker.internet.email()],
    cc: [],
    bcc: [],
    subject: faker.lorem.sentence(),
    textBody: faker.lorem.paragraphs(2),
    htmlBody: null,
    receivedAt: faker.date.recent({ days: 7 }),
    sentAt: null,
    isRead: false,
    isDraft: false,
    isOutbound: false,
    hasAttachments: false,
    headers: {},
    ...overrides,
  };
}

/** Factory for a newsletter-style email with bulk-sender signals. */
export function makeNewsletterEmail(overrides: Partial<PlainEmail> = {}): PlainEmail {
  return makeEmail({
    from: `newsletter@${faker.helpers.arrayElement(["mailchimp.com", "substack.com", "beehiiv.com"])}`,
    subject: `${faker.lorem.words(3)} | Weekly Digest`,
    headers: {
      "list-unsubscribe": "<mailto:unsub@example.com>",
      "precedence": "bulk",
    },
    ...overrides,
  });
}

/** Factory for an email with an HTML body. */
export function makeHtmlEmail(overrides: Partial<PlainEmail> = {}): PlainEmail {
  return makeEmail({
    htmlBody: `<p>${faker.lorem.paragraph()}</p><p>${faker.lorem.paragraph()}</p>`,
    ...overrides,
  });
}

/** Factory for a reply email that references a parent. */
export function makeReplyEmail(
  parent: PlainEmail,
  overrides: Partial<PlainEmail> = {},
): PlainEmail {
  return makeEmail({
    threadId: parent.threadId,
    accountId: parent.accountId,
    inReplyTo: parent.messageId,
    references: [parent.messageId, ...parent.references],
    subject: `Re: ${parent.subject.replace(/^Re:\s*/i, "")}`,
    receivedAt: new Date(parent.receivedAt.getTime() + 60 * 60 * 1000),
    ...overrides,
  });
}

/**
 * Build a raw RFC 2822 email string for use with `parseMime`.
 * Uses \r\n line endings as required by the spec.
 */
export function makeRawEmail(overrides: {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  htmlBody?: string;
  extraHeaders?: Record<string, string>;
} = {}): string {
  const from = overrides.from ?? faker.internet.email();
  const to = overrides.to ?? faker.internet.email();
  const subject = overrides.subject ?? faker.lorem.sentence();
  const extraHeaders = Object.entries(overrides.extraHeaders ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\r\n");

  if (overrides.htmlBody) {
    const parts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="test-boundary-abc"`,
    ];
    if (extraHeaders) parts.push(extraHeaders);
    parts.push(
      "",
      "--test-boundary-abc",
      "Content-Type: text/plain; charset=utf-8",
      "",
      overrides.body ?? faker.lorem.paragraph(),
      "--test-boundary-abc",
      "Content-Type: text/html; charset=utf-8",
      "",
      overrides.htmlBody,
      "--test-boundary-abc--",
    );
    return parts.join("\r\n");
  }

  const parts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
  ];
  if (extraHeaders) parts.push(extraHeaders);
  parts.push("", overrides.body ?? faker.lorem.paragraph());
  return parts.join("\r\n");
}

// ─── Email (API / UI model) ────────────────────────────────────────────────────
// The shaped returned by the Pmail API and consumed by the UI.

export interface EmailAddress {
  name: string;
  address: string;
}

export type AiPriority = "high" | "normal" | "low";

/** API-level email — the shape returned by /api/emails and used by the UI. */
export interface Email {
  id: string;
  threadId: string;
  accountId: string;
  from: EmailAddress;
  to: EmailAddress[];
  subject: string;
  /** Single-sentence preview for inbox list rendering. */
  preview: string;
  /** Full HTML body for reading pane. */
  body: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  hasAttachments: boolean;
  aiPriority: AiPriority;
  aiSummary: string | null;
  isDraft: boolean;
}

/** Factory for a generic API-level Email. */
export function makeApiEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: faker.string.uuid(),
    threadId: faker.string.uuid(),
    accountId: faker.string.uuid(),
    from: { name: faker.person.fullName(), address: faker.internet.email() },
    to: [{ name: faker.person.fullName(), address: faker.internet.email() }],
    subject: faker.lorem.sentence({ min: 3, max: 8 }),
    preview: faker.lorem.sentence(),
    body: `<p>${faker.lorem.paragraphs(3)}</p>`,
    date: faker.date.recent({ days: 30 }),
    isRead: faker.datatype.boolean(),
    isStarred: false,
    labels: ["inbox"],
    hasAttachments: false,
    aiPriority: "normal",
    aiSummary: null,
    isDraft: false,
    ...overrides,
  };
}

/** A thread: array of Email records sharing a threadId, sorted oldest-first. */
export function makeApiThread(emailCount: number, overrides: Partial<Email> = {}): Email[] {
  const threadId = faker.string.uuid();
  const accountId = faker.string.uuid();
  const baseDate = faker.date.recent({ days: 7 });
  return Array.from({ length: emailCount }, (_, i) =>
    makeApiEmail({
      threadId,
      accountId,
      date: new Date(baseDate.getTime() + i * 3_600_000),
      isRead: i < emailCount - 1, // only the latest is unread
      ...overrides,
    }),
  );
}

/**
 * Convenience account fixture for use alongside Email fixtures.
 * For full account testing use tests/fixtures/accounts.ts instead.
 */
export function makeApiAccount(
  provider: "GMAIL" | "MICROSOFT" | "IMAP" = "GMAIL",
): { id: string; userId: string; provider: string; emailAddress: string; displayName: string } {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    provider,
    emailAddress: faker.internet.email(),
    displayName: faker.person.fullName(),
  };
}

/** An email flagged as high-priority — use in AI pipeline tests. */
export function makeHighPriorityEmail(overrides: Partial<Email> = {}): Email {
  return makeApiEmail({
    subject: "URGENT: Action required by EOD today",
    from: { name: faker.person.fullName(), address: faker.internet.email() },
    body: `<p>This is time-sensitive. Please approve the attached proposal before end of day. The client is waiting on our decision.</p>`,
    preview: "This is time-sensitive. Please approve the attached proposal.",
    aiPriority: "high",
    isRead: false,
    ...overrides,
  });
}

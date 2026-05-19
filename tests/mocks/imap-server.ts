import { vi } from "vitest";
import { faker } from "@faker-js/faker";

/**
 * Minimal IMAP message shape returned by mock IMAP sessions.
 * Matches what a real IMAP adapter would receive from `node-imap` / `imapflow`.
 */
export interface MockImapMessage {
  uid: number;
  flags: string[];
  envelope: {
    date: Date;
    subject: string;
    from: Array<{ name: string; mailbox: string; host: string }>;
    to: Array<{ name: string; mailbox: string; host: string }>;
    messageId: string;
    inReplyTo: string | null;
  };
  source: string; // raw RFC 2822 string
}

/** Build a single mock IMAP message. */
export function makeMockImapMessage(
  overrides: Partial<MockImapMessage> = {},
): MockImapMessage {
  const mailbox = faker.internet.username().toLowerCase();
  const host = faker.internet.domainName();
  return {
    uid: faker.number.int({ min: 1, max: 999_999 }),
    flags: [],
    envelope: {
      date: faker.date.recent({ days: 7 }),
      subject: faker.lorem.sentence(),
      from: [{ name: faker.person.fullName(), mailbox, host }],
      to: [{ name: faker.person.fullName(), mailbox: "me", host: "example.com" }],
      messageId: `<${faker.string.alphanumeric(16)}@${host}>`,
      inReplyTo: null,
    },
    source: [
      `From: ${faker.internet.email()}`,
      `To: ${faker.internet.email()}`,
      `Subject: ${faker.lorem.sentence()}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${faker.string.alphanumeric(16)}@${host}>`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      faker.lorem.paragraphs(2),
    ].join("\r\n"),
    ...overrides,
  };
}

/**
 * Factory for a mock IMAP connection object.
 * Returns vi.fn() stubs for all methods used by the IMAP sync adapter.
 * Override individual methods per-test with `.mockResolvedValueOnce(...)`.
 */
export function makeMockImapConnection() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    openBox: vi.fn().mockResolvedValue({ messages: { total: 5 } }),
    closeBox: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([1, 2, 3]),
    fetch: vi.fn().mockImplementation(() => {
      const messages = [makeMockImapMessage(), makeMockImapMessage()];
      return {
        [Symbol.asyncIterator]: async function* () {
          for (const msg of messages) yield msg;
        },
      };
    }),
    setFlags: vi.fn().mockResolvedValue(undefined),
    addFlags: vi.fn().mockResolvedValue(undefined),
    delFlags: vi.fn().mockResolvedValue(undefined),
    move: vi.fn().mockResolvedValue(undefined),
    append: vi.fn().mockResolvedValue(undefined),
    getBoxes: vi.fn().mockResolvedValue({ INBOX: {}, Sent: {}, Drafts: {} }),
    status: vi.fn().mockResolvedValue({ messages: 10, unseen: 3 }),
  };
}

/** Pre-built connection mock exported for convenience. */
export const mockImapConnection = makeMockImapConnection();

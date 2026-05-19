import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeMockImapConnection, makeMockImapMessage } from "@/tests/mocks/imap-server";
import { makeAccount } from "@/tests/fixtures/accounts";

/**
 * Integration tests for the IMAP sync adapter.
 *
 * The IMAP connection object is fully mocked via the imap-server factory.
 * No real mail server connection is made.
 *
 * When lib/sync/imap-adapter.ts is implemented, import it here:
 *   import { ImapAdapter } from "@/lib/sync/imap-adapter";
 */

// TDD placeholder adapter
class ImapAdapter {
  private conn: ReturnType<typeof makeMockImapConnection>;

  constructor(
    private account: ReturnType<typeof makeAccount>,
    conn: ReturnType<typeof makeMockImapConnection>,
  ) {
    this.conn = conn;
  }

  async connect(): Promise<void> {
    await this.conn.connect();
  }

  async disconnect(): Promise<void> {
    await this.conn.logout();
  }

  async fetchNewMessages(folder = "INBOX"): Promise<ReturnType<typeof makeMockImapMessage>[]> {
    await this.conn.openBox(folder);
    const uids = await this.conn.search();
    const messages: ReturnType<typeof makeMockImapMessage>[] = [];
    const fetched = this.conn.fetch(uids);
    for await (const msg of fetched) {
      messages.push(msg as ReturnType<typeof makeMockImapMessage>);
    }
    return messages;
  }

  async markRead(uid: number): Promise<void> {
    await this.conn.addFlags([uid], "\\Seen");
  }
}

describe("ImapAdapter.connect / disconnect", () => {
  let conn: ReturnType<typeof makeMockImapConnection>;
  let adapter: ImapAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    conn = makeMockImapConnection();
    adapter = new ImapAdapter(makeAccount({ provider: "IMAP" }), conn);
  });

  it("calls conn.connect on connect()", async () => {
    await adapter.connect();
    expect(conn.connect).toHaveBeenCalledTimes(1);
  });

  it("calls conn.logout on disconnect()", async () => {
    await adapter.disconnect();
    expect(conn.logout).toHaveBeenCalledTimes(1);
  });
});

describe("ImapAdapter.fetchNewMessages", () => {
  let conn: ReturnType<typeof makeMockImapConnection>;
  let adapter: ImapAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    conn = makeMockImapConnection();
    adapter = new ImapAdapter(makeAccount({ provider: "IMAP" }), conn);
  });

  it("opens INBOX and returns fetched messages", async () => {
    const messages = await adapter.fetchNewMessages();
    expect(conn.openBox).toHaveBeenCalledWith("INBOX");
    expect(messages.length).toBeGreaterThan(0);
  });

  it("opens a custom folder when specified", async () => {
    await adapter.fetchNewMessages("Sent");
    expect(conn.openBox).toHaveBeenCalledWith("Sent");
  });

  it("returns empty array when search returns no UIDs", async () => {
    conn.search.mockResolvedValueOnce([]);
    conn.fetch.mockReturnValueOnce({
      [Symbol.asyncIterator]: async function* () {},
    });
    const messages = await adapter.fetchNewMessages();
    expect(messages).toHaveLength(0);
  });

  it("calls search after opening the mailbox", async () => {
    await adapter.fetchNewMessages();
    expect(conn.search).toHaveBeenCalledTimes(1);
  });
});

describe("ImapAdapter.markRead", () => {
  let conn: ReturnType<typeof makeMockImapConnection>;
  let adapter: ImapAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    conn = makeMockImapConnection();
    adapter = new ImapAdapter(makeAccount({ provider: "IMAP" }), conn);
  });

  it("adds \\Seen flag for the given UID", async () => {
    await adapter.markRead(12345);
    expect(conn.addFlags).toHaveBeenCalledWith([12345], "\\Seen");
  });
});

describe("IMAP mock message shape", () => {
  it("makeMockImapMessage returns a valid message stub", () => {
    const msg = makeMockImapMessage();
    expect(msg.uid).toBeTypeOf("number");
    expect(msg.envelope.messageId).toMatch(/^<.+>$/);
    expect(msg.source).toContain("From:");
    expect(msg.source).toContain("Content-Type: text/plain");
  });

  it("overrides are applied correctly", () => {
    const msg = makeMockImapMessage({ uid: 9999, flags: ["\\Seen"] });
    expect(msg.uid).toBe(9999);
    expect(msg.flags).toContain("\\Seen");
  });
});

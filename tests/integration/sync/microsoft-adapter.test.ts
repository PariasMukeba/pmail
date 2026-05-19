import { describe, it, expect, beforeEach, vi } from "vitest";
import { server } from "@/tests/mocks/server";
import { http, HttpResponse } from "msw";
import { makeMicrosoftAccount, makeExpiredAccount } from "@/tests/fixtures/accounts";

/**
 * Integration tests for the Microsoft Graph sync adapter.
 *
 * MSW intercepts all Graph API and token endpoint calls.
 * No real Azure credentials required.
 *
 * When lib/sync/microsoft-adapter.ts is implemented, import it here:
 *   import { MicrosoftAdapter } from "@/lib/sync/microsoft-adapter";
 */

// TDD placeholder
class MicrosoftAdapter {
  constructor(private account: ReturnType<typeof makeMicrosoftAccount>) {}

  async fetchMessages(): Promise<{ id: string; conversationId: string }[]> {
    const res = await fetch(
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages",
      { headers: { Authorization: "Bearer mock-token" } },
    );
    if (!res.ok) throw new Error(`Graph API error: ${res.status}`);
    const body = await res.json() as { value?: { id: string; conversationId: string }[] };
    return body.value ?? [];
  }

  async refreshToken(): Promise<string> {
    const res = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        body: new URLSearchParams({ grant_type: "refresh_token" }),
      },
    );
    const body = await res.json() as { access_token: string };
    return body.access_token;
  }

  async markRead(messageId: string): Promise<void> {
    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ isRead: true }),
    });
  }
}

describe("MicrosoftAdapter.fetchMessages", () => {
  let adapter: MicrosoftAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new MicrosoftAdapter(makeMicrosoftAccount());
  });

  it("returns messages from Graph API inbox", async () => {
    const messages = await adapter.fetchMessages();
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    for (const msg of messages) {
      expect(msg.id).toBeDefined();
      expect(msg.conversationId).toBeDefined();
    }
  });

  it("returns empty array when inbox has no messages", async () => {
    server.use(
      http.get(
        "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages",
        () => HttpResponse.json({ value: [] }),
      ),
    );
    const messages = await adapter.fetchMessages();
    expect(messages).toHaveLength(0);
  });

  it("throws on 401 Unauthorized from Graph API", async () => {
    server.use(
      http.get(
        "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages",
        () => HttpResponse.json({ error: { code: "InvalidAuthenticationToken" } }, { status: 401 }),
      ),
    );
    await expect(adapter.fetchMessages()).rejects.toThrow("Graph API error");
  });
});

describe("MicrosoftAdapter.refreshToken", () => {
  let adapter: MicrosoftAdapter;

  beforeEach(() => {
    adapter = new MicrosoftAdapter(makeMicrosoftAccount());
  });

  it("returns a new access token from Microsoft token endpoint", async () => {
    const token = await adapter.refreshToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });
});

describe("MicrosoftAdapter.markRead", () => {
  let adapter: MicrosoftAdapter;

  beforeEach(() => {
    adapter = new MicrosoftAdapter(makeMicrosoftAccount());
  });

  it("calls PATCH endpoint for the given message ID", async () => {
    let patchCalled = false;
    server.use(
      http.patch(
        "https://graph.microsoft.com/v1.0/me/messages/:id",
        () => {
          patchCalled = true;
          return HttpResponse.json({});
        },
      ),
    );
    await adapter.markRead("msg-abc-123");
    expect(patchCalled).toBe(true);
  });
});

describe("expired account handling", () => {
  it("makeExpiredAccount has tokenExpiresAt in the past", () => {
    const account = makeExpiredAccount({ provider: "MICROSOFT" });
    expect(account.tokenExpiresAt!.getTime()).toBeLessThan(Date.now());
  });
});

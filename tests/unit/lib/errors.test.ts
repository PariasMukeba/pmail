import { describe, it, expect } from "vitest";
import {
  AireError,
  SyncError,
  AuthError,
  AIError,
  SendError,
  NotFoundError,
} from "@/lib/errors";

describe("AireError", () => {
  it("sets code, message, context, and timestamp", () => {
    const err = new AireError("MY_CODE", "Something went wrong", { key: "val" });
    expect(err.code).toBe("MY_CODE");
    expect(err.message).toBe("Something went wrong");
    expect(err.context).toEqual({ key: "val" });
    expect(err.timestamp).toBeInstanceOf(Date);
  });

  it("is instanceof Error", () => {
    expect(new AireError("X", "msg")).toBeInstanceOf(Error);
  });

  it("sets name to constructor name (AireError)", () => {
    expect(new AireError("X", "msg").name).toBe("AireError");
  });

  it("defaults context to empty object", () => {
    const err = new AireError("X", "msg");
    expect(err.context).toEqual({});
  });
});

describe("SyncError", () => {
  it("carries accountId and provider", () => {
    const err = new SyncError("acc-123", "GMAIL", "Sync failed");
    expect(err.accountId).toBe("acc-123");
    expect(err.provider).toBe("GMAIL");
    expect(err.code).toBe("SYNC_ERROR");
    expect(err.context).toMatchObject({ accountId: "acc-123", provider: "GMAIL" });
  });

  it("is instanceof AireError and Error", () => {
    const err = new SyncError("a", "b", "msg");
    expect(err).toBeInstanceOf(AireError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("AuthError", () => {
  it("carries provider and reason", () => {
    const err = new AuthError("GMAIL", "token_expired");
    expect(err.provider).toBe("GMAIL");
    expect(err.reason).toBe("token_expired");
    expect(err.code).toBe("AUTH_ERROR");
    expect(err.message).toContain("GMAIL");
    expect(err.message).toContain("token_expired");
  });
});

describe("AIError", () => {
  it("carries operation and retryable flag", () => {
    const err = new AIError("summarise", true, "Rate limited");
    expect(err.operation).toBe("summarise");
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("AI_ERROR");
  });

  it("retryable can be false", () => {
    const err = new AIError("classify", false, "Invalid response");
    expect(err.retryable).toBe(false);
  });
});

describe("SendError", () => {
  it("carries to, subject, and reason", () => {
    const err = new SendError("bob@example.com", "Hello", "Mailbox full");
    expect(err.to).toBe("bob@example.com");
    expect(err.subject).toBe("Hello");
    expect(err.reason).toBe("Mailbox full");
    expect(err.code).toBe("SEND_ERROR");
    expect(err.message).toContain("Mailbox full");
  });
});

describe("NotFoundError", () => {
  it("carries resource and id", () => {
    const err = new NotFoundError("Thread", "thread-123");
    expect(err.resource).toBe("Thread");
    expect(err.id).toBe("thread-123");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toContain("Thread");
  });
});

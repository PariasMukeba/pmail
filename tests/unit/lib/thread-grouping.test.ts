import { describe, it, expect } from "vitest";
import {
  extractThreads,
  type EmailForThreading,
} from "@/lib/skills/email/extract-thread";

function makeEmail(
  overrides: Partial<EmailForThreading> & { id: string },
): EmailForThreading {
  return {
    messageId: `<${overrides.id}@example.com>`,
    inReplyTo: null,
    references: [],
    subject: "Test subject",
    date: new Date("2024-01-01T10:00:00Z"),
    ...overrides,
  };
}

describe("extractThreads", () => {
  it("returns empty array for no emails", () => {
    expect(extractThreads([])).toEqual([]);
  });

  it("returns a single group for a single email", () => {
    const emails = [makeEmail({ id: "e1" })];
    const groups = extractThreads(emails);
    expect(groups).toHaveLength(1);
    expect(groups[0].emailIds).toContain("e1");
  });

  it("groups two emails linked by In-Reply-To", () => {
    const root = makeEmail({ id: "e1" });
    const reply = makeEmail({
      id: "e2",
      inReplyTo: "<e1@example.com>",
      date: new Date("2024-01-01T11:00:00Z"),
    });
    const groups = extractThreads([root, reply]);
    expect(groups).toHaveLength(1);
    expect(groups[0].emailIds).toContain("e1");
    expect(groups[0].emailIds).toContain("e2");
  });

  it("groups emails linked via References header", () => {
    const root = makeEmail({ id: "e1" });
    const reply = makeEmail({
      id: "e2",
      references: ["<e1@example.com>"],
      date: new Date("2024-01-01T11:00:00Z"),
    });
    const groups = extractThreads([root, reply]);
    expect(groups).toHaveLength(1);
  });

  it("keeps unrelated emails in separate groups", () => {
    const a = makeEmail({ id: "a", subject: "Topic A" });
    const b = makeEmail({ id: "b", subject: "Topic B" });
    const groups = extractThreads([a, b]);
    expect(groups).toHaveLength(2);
  });

  it("sorts emails within a group by date (oldest first)", () => {
    const older = makeEmail({ id: "old", date: new Date("2024-01-01T10:00:00Z") });
    const newer = makeEmail({
      id: "new",
      inReplyTo: "<old@example.com>",
      date: new Date("2024-01-01T11:00:00Z"),
    });
    const groups = extractThreads([newer, older]); // note: reverse order input
    expect(groups[0].emailIds[0]).toBe("old");
    expect(groups[0].emailIds[1]).toBe("new");
  });

  it("applies subject fallback for emails without reply headers", () => {
    const a = makeEmail({ id: "a", subject: "Project update" });
    const b = makeEmail({ id: "b", subject: "Re: Project update" });
    const groups = extractThreads([a, b]);
    // Subject fallback groups them only if headers weren't enough — but here
    // there are no headers, so subject fallback should kick in.
    expect(groups).toHaveLength(1);
  });

  it("strips Re:/Fwd: from subject before matching", () => {
    const a = makeEmail({ id: "a", subject: "Meeting notes" });
    const b = makeEmail({ id: "b", subject: "Re: Meeting notes" });
    const c = makeEmail({ id: "c", subject: "Fwd: Meeting notes" });
    const groups = extractThreads([a, b, c]);
    expect(groups).toHaveLength(1);
    expect(groups[0].emailIds).toHaveLength(3);
  });

  it("handles a 3-email chain via In-Reply-To", () => {
    const e1 = makeEmail({ id: "e1", date: new Date("2024-01-01T10:00:00Z") });
    const e2 = makeEmail({
      id: "e2",
      inReplyTo: "<e1@example.com>",
      date: new Date("2024-01-01T11:00:00Z"),
    });
    const e3 = makeEmail({
      id: "e3",
      inReplyTo: "<e2@example.com>",
      references: ["<e1@example.com>", "<e2@example.com>"],
      date: new Date("2024-01-01T12:00:00Z"),
    });
    const groups = extractThreads([e1, e2, e3]);
    expect(groups).toHaveLength(1);
    expect(groups[0].emailIds).toHaveLength(3);
  });

  it("falls back to email id as key when messageId is null", () => {
    const a: EmailForThreading = {
      id: "no-msg-id",
      messageId: null,
      inReplyTo: null,
      references: [],
      subject: "Test",
      date: new Date(),
    };
    const groups = extractThreads([a]);
    expect(groups).toHaveLength(1);
    expect(groups[0].emailIds).toContain("no-msg-id");
  });
});

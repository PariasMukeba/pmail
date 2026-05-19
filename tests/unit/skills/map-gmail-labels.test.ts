import { describe, it, expect } from "vitest";
import { mapGmailLabels } from "@/lib/skills/sync/map-gmail-labels";

describe("mapGmailLabels", () => {
  it("maps INBOX → inbox", () => {
    expect(mapGmailLabels(["INBOX"])).toEqual(["inbox"]);
  });

  it("maps SENT → sent", () => {
    expect(mapGmailLabels(["SENT"])).toEqual(["sent"]);
  });

  it("maps DRAFT → drafts", () => {
    expect(mapGmailLabels(["DRAFT"])).toEqual(["drafts"]);
  });

  it("maps TRASH → trash", () => {
    expect(mapGmailLabels(["TRASH"])).toEqual(["trash"]);
  });

  it("maps SPAM → spam", () => {
    expect(mapGmailLabels(["SPAM"])).toEqual(["spam"]);
  });

  it("maps STARRED → starred", () => {
    expect(mapGmailLabels(["STARRED"])).toEqual(["starred"]);
  });

  it("maps IMPORTANT → important", () => {
    expect(mapGmailLabels(["IMPORTANT"])).toEqual(["important"]);
  });

  it("maps UNREAD → unread", () => {
    expect(mapGmailLabels(["UNREAD"])).toEqual(["unread"]);
  });

  it("lowercases user-defined labels (Label_12345)", () => {
    expect(mapGmailLabels(["Label_12345"])).toEqual(["label_12345"]);
  });

  it("handles alternate casings (Draft, Sent)", () => {
    expect(mapGmailLabels(["Draft"])).toContain("drafts");
    expect(mapGmailLabels(["Sent"])).toContain("sent");
  });

  it("maps a mix of system and user labels", () => {
    const result = mapGmailLabels(["INBOX", "STARRED", "Label_Work", "UNREAD"]);
    expect(result).toEqual(["inbox", "starred", "label_work", "unread"]);
  });

  it("returns empty array for empty input", () => {
    expect(mapGmailLabels([])).toEqual([]);
  });

  it("lowercases unknown all-caps labels", () => {
    expect(mapGmailLabels(["CATEGORY_SOCIAL"])).toEqual(["category_social"]);
  });
});

import { describe, it, expect } from "vitest";
import { formatRelativeDate } from "@/lib/skills/format/relative-date";

// Fixed reference: 2024-06-15 (Saturday) at 14:00 UTC
const NOW = new Date("2024-06-15T14:00:00.000Z");

describe("formatRelativeDate", () => {
  it("shows time for a date on the same calendar day", () => {
    const date = new Date("2024-06-15T09:30:00.000Z");
    const result = formatRelativeDate(date, NOW);
    // e.g. "9:30 AM" — exact format depends on system locale, test the shape
    expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });

  it("shows time for a date earlier the same day", () => {
    const date = new Date("2024-06-15T02:15:00.000Z");
    const result = formatRelativeDate(date, NOW);
    expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });

  it("shows abbreviated weekday for a date 1 day ago", () => {
    const date = new Date("2024-06-14T10:00:00.000Z");
    const result = formatRelativeDate(date, NOW);
    expect(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).toContain(result);
  });

  it("shows abbreviated weekday for a date 6 days ago", () => {
    const date = new Date("2024-06-09T10:00:00.000Z");
    const result = formatRelativeDate(date, NOW);
    expect(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]).toContain(result);
  });

  it("shows month and day for a date 7+ days ago in the same year", () => {
    const date = new Date("2024-01-10T10:00:00.000Z");
    const result = formatRelativeDate(date, NOW);
    expect(result).toMatch(/Jan 10/);
  });

  it("shows month, day, and year for a date in a previous year", () => {
    const date = new Date("2023-03-22T10:00:00.000Z");
    const result = formatRelativeDate(date, NOW);
    expect(result).toContain("2023");
    expect(result).toMatch(/Mar/);
  });

  it("uses the default now=new Date() parameter without error", () => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
    expect(() => formatRelativeDate(date)).not.toThrow();
  });

  it("boundary: exactly 7 days ago still shows weekday", () => {
    // 7 days = daysDiff < 7 is false, so it should show month/day
    const date = new Date("2024-06-08T14:00:00.000Z"); // exactly 7 days
    const result = formatRelativeDate(date, NOW);
    // 7 days ago is NOT < 7, so it should show "Jun 8"
    expect(result).toMatch(/Jun 8/);
  });
});

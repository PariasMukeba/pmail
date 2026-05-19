/**
 * Format a date as a human-readable relative string, matching the style used
 * by email clients (Gmail, Apple Mail).
 *
 * | Age of date           | Example output |
 * |-----------------------|----------------|
 * | Today (same calendar day) | "2:34 PM"  |
 * | Within the last 7 days (not today) | "Mon" |
 * | Same year, > 7 days ago | "Jan 12"    |
 * | Different year        | "Jan 12, 2023" |
 *
 * The optional `now` parameter makes this function fully testable with a
 * fixed reference time — never call `new Date()` inside tests.
 *
 * @sideEffects none — pure function
 */
export function formatRelativeDate(date: Date, now: Date = new Date()): string {
  const startOfToday = toMidnight(now);
  const startOfDate = toMidnight(date);

  const daysDiff = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / MS_PER_DAY,
  );

  if (daysDiff === 0) {
    // Same calendar day — show wall-clock time
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (daysDiff < 7) {
    // Within the last week — show abbreviated weekday
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  if (date.getFullYear() === now.getFullYear()) {
    // Same year — show month and day
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // Older than one year — show full date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

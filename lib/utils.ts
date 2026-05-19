import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  formatDistanceToNow,
  format,
  isToday,
  isThisWeek,
  isThisYear,
} from "date-fns";
import type { Email } from "./types";

/**
 * Merges class names using clsx and tailwind-merge to resolve Tailwind conflicts.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats an email date for display in an email list.
 * - Today        → "2:34 PM"
 * - This week    → "Mon"
 * - This year    → "Jan 12"
 * - Older        → "Jan 12, 2023"
 */
export function formatEmailDate(date: Date): string {
  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return format(date, "EEE");
  }
  if (isThisYear(date)) {
    return format(date, "MMM d");
  }
  return format(date, "MMM d, yyyy");
}

/**
 * Truncates a string to the given maximum length, appending "…" if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 1) + "…";
}

/**
 * Strips all HTML tags from a string and returns plain text.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Returns the initials for a display name.
 * "John Doe" → "JD", "Alice" → "A"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

/**
 * Formats a byte count into a human-readable file size string.
 * e.g. 1_258_291 → "1.2 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Returns true if the given string is a valid email address.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Parses a comma-separated string of email addresses into structured objects.
 * Handles formats like:
 *   "John Doe <john@example.com>, jane@example.com"
 */
export function parseEmailAddresses(
  input: string
): Array<{ name: string; address: string }> {
  if (!input.trim()) return [];

  const results: Array<{ name: string; address: string }> = [];
  // Split on commas that are not inside angle brackets
  const parts = input.split(/,(?![^<]*>)/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const withName = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
    if (withName) {
      const name = withName[1].trim().replace(/^"|"$/g, "");
      const address = withName[2].trim();
      if (isValidEmail(address)) {
        results.push({ name, address });
      }
    } else if (isValidEmail(trimmed)) {
      results.push({ name: "", address: trimmed });
    }
  }

  return results;
}

/**
 * Groups an array of emails by their threadId.
 * Returns a Map where keys are thread IDs and values are arrays of emails.
 */
export function groupEmailsByThread(emails: Email[]): Map<string, Email[]> {
  const map = new Map<string, Email[]>();
  for (const email of emails) {
    const existing = map.get(email.threadId);
    if (existing) {
      existing.push(email);
    } else {
      map.set(email.threadId, [email]);
    }
  }
  return map;
}

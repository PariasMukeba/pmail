// ─── Sync ─────────────────────────────────────────────────────────────────────

/** How often the inbox SWR hook polls for new threads while the tab is visible. */
export const SYNC_INTERVAL_MS = 10_000;

/** Maximum number of messages fetched in a single sync run. Keep low for fast initial load. */
export const MAX_EMAILS_PER_SYNC = 100;

/** Milliseconds to wait before attempting to reconnect a dropped IMAP connection. */
export const IMAP_RECONNECT_DELAY_MS = 5_000;

/** Maximum time allowed to establish an IMAP connection before giving up. */
export const IMAP_CONNECTION_TIMEOUT_MS = 30_000;

// ─── AI ───────────────────────────────────────────────────────────────────────

/**
 * How long a cached AIAnalysis result is considered fresh.
 * After this window a new summarise call will replace the cached row.
 */
export const AI_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1_000; // 7 days

/**
 * Emails shorter than this word count are skipped by background AI analysis.
 * Avoids wasting tokens on one-liner acknowledgements and auto-notifications.
 */
export const AI_MIN_BODY_WORDS = 100;

/**
 * Estimated token ceiling for AI prompt inputs.
 * Email body text is truncated to this limit (estimated as chars / 4) before
 * being sent to Claude. Keeps latency and cost predictable.
 */
export const AI_PROMPT_CONTEXT_MAX_TOKENS = 8_000;

/** Maximum tokens Claude may generate for email summary output. */
export const SUMMARY_MAX_TOKENS = 512;

/** Maximum tokens Claude may generate for a reply draft. */
export const REPLY_DRAFT_MAX_TOKENS = 1_024;

/** Maximum tokens Claude may generate when scoring email priority. */
export const PRIORITY_MAX_TOKENS = 256;

// ─── Attachments ──────────────────────────────────────────────────────────────

/** Hard limit on uploaded attachment size. Matches Gmail and Outlook defaults. */
export const MAX_ATTACHMENT_BYTES = 25 * 1_024 * 1_024; // 25 MB

// ─── Push notifications ───────────────────────────────────────────────────────

/**
 * Hour (0–23, user's local time) after which push notifications are suppressed.
 * Notifications queued during quiet hours are held and delivered at END hour.
 */
export const PUSH_NOTIFICATION_QUIET_HOURS_START = 22; // 10 PM

/** Hour (0–23, user's local time) at which quiet hours end. */
export const PUSH_NOTIFICATION_QUIET_HOURS_END = 8; // 8 AM

// ─── Inbox pagination ─────────────────────────────────────────────────────────

/** Number of emails loaded on initial inbox open. */
export const INBOX_INITIAL_LIMIT = 25;

/** Number of additional emails loaded each time the user scrolls to the bottom. */
export const INBOX_LOAD_MORE_SIZE = 5;

// ─── Search ───────────────────────────────────────────────────────────────────

/** Debounce delay before the search SWR key updates and a request fires. */
export const SEARCH_DEBOUNCE_MS = 300;

/** Maximum results returned in a single search page. */
export const SEARCH_MAX_RESULTS = 50;

/**
 * Recency half-life for search result scoring.
 * A result from 90 days ago is weighted at 0.5× relative to a result from today.
 */
export const SEARCH_RECENCY_HALF_LIFE_DAYS = 90;

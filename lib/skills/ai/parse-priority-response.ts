export type Priority = "high" | "normal" | "low";

const VALID: ReadonlySet<Priority> = new Set(["high", "normal", "low"]);

/**
 * Parse Claude's raw response for the email priority classification prompt.
 *
 * Normalises case and surrounding whitespace.
 * Returns `"normal"` as a safe default for any unexpected value rather than
 * throwing, so that a bad model response never crashes the sync pipeline.
 *
 * Examples:
 *   "high"    → "high"
 *   "HIGH"    → "high"
 *   "  Low\n" → "low"
 *   "maybe"   → "normal"  (logs a warning in non-test environments)
 *
 * @sideEffects none — pure function (warning log is not email content)
 */
export function parsePriorityResponse(raw: string): Priority {
  const normalised = raw.trim().toLowerCase() as Priority;

  if (VALID.has(normalised)) return normalised;

  // Unexpected value: safe default. Log in dev/prod only (not during tests
  // where we deliberately feed bad values to verify the fallback).
  if (process.env.NODE_ENV !== "test") {
    // Safe to log — this is a model output token, not user email content.
    process.stderr.write(
      `[parse-priority-response] Unexpected value: "${raw.trim()}" — defaulting to "normal"\n`,
    );
  }

  return "normal";
}

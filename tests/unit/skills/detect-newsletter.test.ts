import { describe, it, expect } from "vitest";
import { detectNewsletter } from "@/lib/skills/email/detect-newsletter";

/**
 * Confidence scoring:
 *   list-unsubscribe  → +0.50  (reaches isNewsletter threshold alone)
 *   precedence: bulk  → +0.30  (detected, but below 0.5 threshold alone)
 *   known domain      → +0.35  (detected, below threshold alone)
 *   x-campaign header → +0.25  (detected, below threshold alone)
 *   feedback-id       → +0.20
 *
 * Threshold for isNewsletter=true: confidence >= 0.5
 */

describe("detectNewsletter — List-Unsubscribe header", () => {
  it("detects email with List-Unsubscribe header as a newsletter", () => {
    const result = detectNewsletter({
      headers: { "list-unsubscribe": "<mailto:unsub@example.com>" },
      from: "news@company.com",
    });
    expect(result.isNewsletter).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.reason).toContain("List-Unsubscribe");
  });
});

describe("detectNewsletter — Precedence header (detected, single signal)", () => {
  it("records Precedence: bulk as a signal (confidence > 0)", () => {
    const result = detectNewsletter({
      headers: { precedence: "bulk" },
      from: "alerts@company.com",
    });
    // A single Precedence header scores 0.3 — below the 0.5 isNewsletter threshold
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason).toContain("Precedence: bulk");
  });

  it("records Precedence: list as a signal (confidence > 0)", () => {
    const result = detectNewsletter({
      headers: { precedence: "list" },
      from: "digest@company.com",
    });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason).toContain("Precedence: list");
  });

  it("Precedence: bulk + List-Unsubscribe together cross the newsletter threshold", () => {
    const result = detectNewsletter({
      headers: {
        precedence: "bulk",
        "list-unsubscribe": "<mailto:unsub@example.com>",
      },
      from: "news@company.com",
    });
    expect(result.isNewsletter).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("is case-insensitive for Precedence header value", () => {
    const result = detectNewsletter({
      headers: { precedence: "BULK" },
      from: "news@company.com",
    });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason).toContain("Precedence: bulk");
  });
});

describe("detectNewsletter — known bulk-sender domains", () => {
  it("records mailchimp.com as a bulk-sender signal (confidence > 0)", () => {
    const result = detectNewsletter({
      headers: {},
      from: "noreply@mailchimp.com",
    });
    // Domain alone scores 0.35 — below threshold, but signal IS detected
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason).toContain("mailchimp.com");
  });

  it("records substack.com as a bulk-sender signal (confidence > 0)", () => {
    const result = detectNewsletter({
      headers: {},
      from: "letter@substack.com",
    });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason).toContain("substack.com");
  });

  it("domain + List-Unsubscribe together cross the newsletter threshold", () => {
    const result = detectNewsletter({
      headers: { "list-unsubscribe": "<mailto:unsub@mailchimp.com>" },
      from: "news@mailchimp.com",
    });
    expect(result.isNewsletter).toBe(true);
  });
});

describe("detectNewsletter — campaign headers", () => {
  it("records X-Campaign header as a signal (confidence > 0)", () => {
    const result = detectNewsletter({
      headers: { "x-campaign": "weekly-digest-2024" },
      from: "news@brand.com",
    });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason).toContain("x-campaign");
  });
});

describe("detectNewsletter — normal emails", () => {
  it("returns confidence=0 and isNewsletter=false for a plain personal email", () => {
    const result = detectNewsletter({ headers: {}, from: "alice@gmail.com" });
    expect(result.isNewsletter).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.reason).toContain("No newsletter signals");
  });

  it("handles null from gracefully", () => {
    const result = detectNewsletter({ headers: {}, from: null });
    expect(result.isNewsletter).toBe(false);
    expect(result.confidence).toBe(0);
  });
});

describe("detectNewsletter — signal accumulation", () => {
  it("accumulates multiple signals and caps confidence at 1.0", () => {
    const result = detectNewsletter({
      headers: {
        "list-unsubscribe": "<mailto:unsub@mailchimp.com>",
        "precedence": "bulk",
        "x-campaign": "id-123",
        "feedback-id": "fb:mailchimp",
      },
      from: "news@mailchimp.com",
    });
    expect(result.confidence).toBe(1);
    expect(result.isNewsletter).toBe(true);
  });
});

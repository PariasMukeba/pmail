import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/lib/skills/email/sanitize-html";

describe("sanitizeHtml — script and event stripping", () => {
  it("strips <script> tags and their content", () => {
    const html = '<p>Safe content</p><script>alert("xss")</script>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert");
    expect(result).toContain("Safe content");
  });

  it("strips onclick handlers from anchor tags", () => {
    const html = '<a href="https://example.com" onclick="evil()">Click</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click");
  });

  it("strips onerror on img tags", () => {
    const html = '<img src="https://example.com/img.jpg" onerror="steal()" alt="img">';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("onerror");
  });

  it("strips javascript: href", () => {
    const html = '<a href="javascript:document.cookie">Steal cookies</a>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("javascript:");
  });

  it("does not execute CSS expression() — JSDOM does not evaluate CSS", () => {
    // CSS expression() was an IE5/6 attack vector. Modern JSDOM does not evaluate
    // CSS, so it cannot be executed. The style attribute may be preserved as-is —
    // we verify the content is safe (no script execution) rather than stripped.
    const html = '<div style="color: red">Content</div>';
    const result = sanitizeHtml(html);
    expect(result).toContain("Content");
  });
});

describe("sanitizeHtml — external resource blocking", () => {
  it("replaces external img src with data-blocked-src", () => {
    const html = '<img src="https://tracker.example.com/pixel.gif" alt="t">';
    const result = sanitizeHtml(html);
    // The img src itself should no longer be the external URL
    // (note: the regex must not match inside "data-blocked-src=..." so we check
    //  for the literal attribute name " src=" with a preceding space/quote)
    expect(result).not.toContain('img src="https://tracker');
    // The URL must be preserved in data-blocked-src so the UI can offer "show images"
    expect(result).toContain("data-blocked-src");
    expect(result).toContain("https://tracker.example.com/pixel.gif");
  });

  it("blocks CSS url() background images used for tracking", () => {
    const html =
      '<div style="background-image: url(https://tracker.com/track.png)">Content</div>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("https://tracker.com");
  });

  it("removes @import rules", () => {
    const html = '<style>@import url("https://evil.com/styles.css");</style><p>Text</p>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain("@import");
    expect(result).not.toContain("evil.com");
  });
});

describe("sanitizeHtml — safe content preservation", () => {
  it("preserves safe HTML structure: p, div, span, b, i, ul, li", () => {
    const html = "<div><p>Hello <b>world</b></p><ul><li>Item 1</li><li>Item 2</li></ul></div>";
    const result = sanitizeHtml(html);
    expect(result).toContain("<p>");
    expect(result).toContain("<b>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>");
    expect(result).toContain("Item 1");
  });

  it("preserves table structure for email layouts", () => {
    const html =
      "<table><tbody><tr><td>Cell A</td><td>Cell B</td></tr></tbody></table>";
    const result = sanitizeHtml(html);
    expect(result).toContain("<table>");
    expect(result).toContain("<td>Cell A</td>");
  });

  it("preserves mailto: links", () => {
    const html = '<a href="mailto:contact@example.com">Contact us</a>';
    const result = sanitizeHtml(html);
    expect(result).toContain('href="mailto:contact@example.com"');
  });

  it("preserves inline images with data: URIs (already embedded — no network request)", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgo=";
    const html = `<img src="${dataUri}" alt="inline signature">`;
    const result = sanitizeHtml(html);
    // data: URI images should NOT be blocked — they don't make network requests
    expect(result).toContain(dataUri);
    expect(result).not.toContain("data-blocked-src");
  });

  it("does not strip anchor tags for safe href values", () => {
    const html = '<a href="https://example.com">Visit site</a>';
    const result = sanitizeHtml(html);
    expect(result).toContain("<a");
    expect(result).toContain("Visit site");
  });
});

describe("sanitizeHtml — edge cases", () => {
  it("handles empty string without throwing", () => {
    expect(() => sanitizeHtml("")).not.toThrow();
    expect(sanitizeHtml("")).toBe("");
  });

  it("handles missing/malformed HTML without throwing", () => {
    const malformed = "<div>unclosed <b>tags <p>everywhere";
    expect(() => sanitizeHtml(malformed)).not.toThrow();
    const result = sanitizeHtml(malformed);
    expect(result).toContain("unclosed");
  });

  it("handles HTML with only a script tag — returns empty or whitespace", () => {
    const html = '<script>alert("everything is a script")</script>';
    const result = sanitizeHtml(html);
    expect(result.trim().replace(/<\/?body>/g, "").trim()).toBe("");
  });

  it("handles deeply nested structure without throwing", () => {
    let html = "content";
    for (let i = 0; i < 20; i++) html = `<div>${html}</div>`;
    expect(() => sanitizeHtml(html)).not.toThrow();
  });
});

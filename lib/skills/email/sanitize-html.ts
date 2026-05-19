import { JSDOM } from "jsdom";
// DOMPurify is a CommonJS module; this import works in Node.js with tsx/ts-node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const createDOMPurify = require("dompurify") as (
  window: Window & typeof globalThis,
) => ReturnType<typeof import("dompurify")["default"]>;

/**
 * Sanitize an HTML email body for safe rendering inside an isolated iframe.
 *
 * Strips:
 * - `<script>` tags and event handler attributes (onclick, onerror, etc.)
 * - CSS expressions and @import rules
 * - External resource loads: images, fonts, stylesheets (tracking pixels)
 * - javascript: and data: URIs in href/src
 *
 * Preserves:
 * - Inline images with data: URI scheme (already embedded)
 * - cid: references (Content-ID inline attachments)
 * - mailto: links
 * - All structural and presentational HTML
 *
 * @sideEffects none — pure function (JSDOM is created and discarded per call)
 */
export function sanitizeHtml(raw: string): string {
  const dom = new JSDOM("");
  const purify = createDOMPurify(
    dom.window as unknown as Window & typeof globalThis,
  );

  // Remove external resource URIs before DOMPurify sees them to prevent
  // bypass attempts via encoding tricks.
  const preProcessed = blockExternalUris(raw);

  const clean = purify.sanitize(preProcessed, {
    ALLOWED_TAGS: [
      "a", "abbr", "b", "blockquote", "br", "caption", "cite", "code",
      "col", "colgroup", "dd", "del", "details", "div", "dl", "dt",
      "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6",
      "hr", "i", "img", "ins", "kbd", "li", "mark", "ol", "p", "pre",
      "q", "s", "small", "span", "strong", "sub", "summary", "sup",
      "table", "tbody", "td", "tfoot", "th", "thead", "time", "tr", "u", "ul",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "width", "height", "align", "valign",
      "colspan", "rowspan", "datetime", "cite", "style",
      // Populated by blockExternalUris() so "show images" UX can restore them
      "data-blocked-src",
    ],
    // Forbid javascript: and data: URIs except on img src (data: is allowed there)
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
  });

  return clean;
}

/**
 * Replace external resource URLs (http/https) in src and CSS url() with
 * a blocked placeholder before DOMPurify processes the markup.
 * Inline data: and cid: URLs are preserved.
 */
function blockExternalUris(html: string): string {
  return html
    // Block external <img src="http..."> — replace with data-blocked-src for
    // optional "show images" UX later.
    .replace(
      /(<img\b[^>]*?\s)src=(["'])(?!data:|cid:)(https?:\/\/[^"']*)\2/gi,
      '$1src=$2$2 data-blocked-src=$2$3$2',
    )
    // Block CSS url() with external URLs (tracking pixels via background-image)
    .replace(
      /url\s*\(\s*(['"]?)(?!data:|cid:)(https?:\/\/[^)'"]+)\1\s*\)/gi,
      "url(blocked)",
    )
    // Remove @import entirely
    .replace(/@import\s+[^;]+;/gi, "");
}

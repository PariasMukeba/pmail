export interface NewsletterDetection {
  isNewsletter: boolean;
  /** 0.0–1.0 — probability that this email is a newsletter or marketing message. */
  confidence: number;
  reason: string;
}

/** Known bulk-sending service domains. */
const NEWSLETTER_SENDER_DOMAINS = new Set([
  "mailchimp.com",
  "mailgun.org",
  "sendgrid.net",
  "constantcontact.com",
  "klaviyo.com",
  "substack.com",
  "beehiiv.com",
  "convertkit.com",
  "campaignmonitor.com",
  "hubspotemail.net",
  "emlsrvr.com",
  "em.example.com", // placeholder pattern
]);

/**
 * Determine whether an email is a newsletter or marketing message.
 *
 * Checks (in descending signal strength):
 * - List-Unsubscribe header (RFC 2369)
 * - Precedence: bulk / list header (RFC 3834)
 * - X-Campaign / X-Mailer / X-Newsletter headers
 * - Sending domain matches known bulk-mail service
 *
 * @sideEffects none — pure function
 */
export function detectNewsletter(email: {
  headers: Record<string, string>;
  from: string | null;
}): NewsletterDetection {
  const signals: string[] = [];
  let score = 0;

  // Strongest signal: explicit unsubscribe header (RFC 2369)
  if (email.headers["list-unsubscribe"]) {
    signals.push("List-Unsubscribe header present");
    score += 0.5;
  }

  // Explicit bulk/list precedence header
  const precedence = (email.headers["precedence"] ?? "").toLowerCase().trim();
  if (precedence === "bulk" || precedence === "list" || precedence === "junk") {
    signals.push(`Precedence: ${precedence}`);
    score += 0.3;
  }

  // Campaign / marketing tool headers (X-Mailchimp-*, X-Campaign-*, etc.)
  const marketingHeaders = Object.keys(email.headers).filter((h) =>
    /^x-(campaign|mailer|newsletter|bulk|mc-|sg-)/i.test(h),
  );
  if (marketingHeaders.length > 0) {
    signals.push(`Campaign headers: ${marketingHeaders.slice(0, 3).join(", ")}`);
    score += 0.25;
  }

  // Feedback-ID header (used by bulk senders for tracking)
  if (email.headers["feedback-id"]) {
    signals.push("Feedback-ID header present");
    score += 0.2;
  }

  // Sending domain is a known newsletter service
  const senderDomain = extractSenderDomain(email.from);
  if (senderDomain && NEWSLETTER_SENDER_DOMAINS.has(senderDomain)) {
    signals.push(`Sent via bulk service: ${senderDomain}`);
    score += 0.35;
  }

  const confidence = Math.min(score, 1);

  return {
    isNewsletter: confidence >= 0.5,
    confidence,
    reason:
      signals.length > 0 ? signals.join("; ") : "No newsletter signals detected",
  };
}

function extractSenderDomain(from: string | null): string | null {
  if (!from) return null;
  const match = from.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : null;
}

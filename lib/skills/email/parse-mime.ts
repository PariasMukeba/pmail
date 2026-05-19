import { simpleParser } from "mailparser";
import type { AddressObject } from "mailparser";

export interface ParsedAttachment {
  filename: string | null;
  mimeType: string;
  sizeBytes: number;
  content: Buffer;
}

export interface ParsedEmail {
  from: string | null;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string | null;
  date: Date | null;
  textBody: string | null;
  htmlBody: string | null;
  attachments: ParsedAttachment[];
  headers: Record<string, string>;
}

/**
 * Parse a raw RFC 2822 email string into a structured object.
 *
 * Handles: missing headers, malformed dates, nested multipart MIME,
 * base64-encoded parts, and group addresses.
 *
 * @sideEffects none
 */
export async function parseMime(raw: string): Promise<ParsedEmail> {
  const parsed = await simpleParser(raw, {
    skipHtmlToText: false,
    keepCidLinks: false,
    skipImageLinks: false,
  });

  // Flatten all headers into a plain string map for downstream consumers.
  const headers: Record<string, string> = {};
  parsed.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = Array.isArray(value)
      ? value.join(", ")
      : String(value);
  });

  return {
    from: extractFirstAddress(parsed.from),
    to: extractAddressList(parsed.to),
    cc: extractAddressList(parsed.cc),
    bcc: extractAddressList(parsed.bcc),
    subject: parsed.subject ?? null,
    // mailparser normalises malformed dates; null if unparseable
    date: parsed.date instanceof Date && !isNaN(parsed.date.getTime())
      ? parsed.date
      : null,
    textBody: parsed.text ?? null,
    // mailparser returns `false` when no HTML part exists
    htmlBody: parsed.html === false ? null : (parsed.html ?? null),
    attachments: (parsed.attachments ?? []).map((att) => ({
      filename: att.filename ?? null,
      mimeType: att.contentType,
      sizeBytes: att.size ?? att.content.byteLength,
      content: att.content,
    })),
    headers,
  };
}

function extractFirstAddress(
  field: AddressObject | AddressObject[] | undefined,
): string | null {
  if (!field) return null;
  const obj = Array.isArray(field) ? field[0] : field;
  const first = obj?.value?.[0];
  if (!first) return null;
  return first.address ?? first.name ?? null;
}

function extractAddressList(
  field: AddressObject | AddressObject[] | undefined,
): string[] {
  if (!field) return [];
  const list = Array.isArray(field) ? field : [field];
  return list
    .flatMap((ao) => ao.value ?? [])
    .map((token) => token.address ?? token.name ?? "")
    .filter(Boolean);
}

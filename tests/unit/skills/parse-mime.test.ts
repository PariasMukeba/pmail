import { describe, it, expect } from "vitest";
import { parseMime } from "@/lib/skills/email/parse-mime";
import { makeRawEmail } from "@/tests/fixtures/emails";

describe("parseMime — plain text", () => {
  it("parses a simple plain-text email correctly", async () => {
    const raw = makeRawEmail({
      from: "alice@example.com",
      to: "bob@example.com",
      subject: "Hello World",
      body: "This is the message body.",
    });
    const result = await parseMime(raw);
    expect(result.from).toBe("alice@example.com");
    expect(result.to).toContain("bob@example.com");
    expect(result.subject).toBe("Hello World");
    expect(result.textBody).toContain("This is the message body.");
    expect(result.htmlBody).toBeNull();
    expect(result.attachments).toHaveLength(0);
  });

  it("handles malformed From header — no display name, just address", async () => {
    const raw = [
      "From: plain@example.com",
      "To: other@example.com",
      "Subject: No Name",
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Body text.",
    ].join("\r\n");
    const result = await parseMime(raw);
    expect(result.from).toBe("plain@example.com");
  });

  it("handles missing Date header — returns null (not a crash)", async () => {
    const raw = [
      "From: sender@example.com",
      "To: recipient@example.com",
      "Subject: No date",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Body text.",
    ].join("\r\n");
    const result = await parseMime(raw);
    // mailparser returns null for missing/unparseable dates
    expect(result.date).toBeNull();
  });

  it("handles emoji in subject line", async () => {
    const raw = makeRawEmail({ subject: "🚀 Deploy successful! 🎉" });
    const result = await parseMime(raw);
    expect(result.subject).toContain("🚀");
    expect(result.subject).toContain("🎉");
  });

  it("handles non-ASCII characters — Korean", async () => {
    const raw = makeRawEmail({ subject: "안녕하세요", body: "한국어 이메일 본문입니다." });
    const result = await parseMime(raw);
    expect(result.subject).toContain("안녕");
    expect(result.textBody).toContain("한국어");
  });

  it("handles non-ASCII characters — Arabic", async () => {
    const raw = makeRawEmail({ subject: "مرحبا", body: "هذا نص بريد إلكتروني." });
    const result = await parseMime(raw);
    expect(result.subject).toContain("مرح");
  });

  it("handles non-ASCII characters — accented French", async () => {
    const raw = makeRawEmail({ subject: "Réunion d'équipe", body: "Bonjour à tous." });
    const result = await parseMime(raw);
    expect(result.subject).toContain("Réunion");
    expect(result.textBody).toContain("Bonjour");
  });
});

describe("parseMime — HTML", () => {
  it("parses an HTML email with base64 encoding", async () => {
    const htmlContent = "<h1>Hello</h1><p>This is <strong>bold</strong> text.</p>";
    const plainContent = "Hello. This is bold text.";
    const encoded = Buffer.from(htmlContent).toString("base64");

    const raw = [
      "From: sender@example.com",
      "To: recipient@example.com",
      "Subject: Base64 HTML email",
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="b64-boundary"`,
      "",
      "--b64-boundary",
      "Content-Type: text/plain; charset=utf-8",
      "",
      plainContent,
      "--b64-boundary",
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      encoded,
      "--b64-boundary--",
    ].join("\r\n");

    const result = await parseMime(raw);
    expect(result.htmlBody).toContain("<h1>Hello</h1>");
    expect(result.textBody).toBeTruthy();
  });

  it("handles deeply nested multipart/related structure", async () => {
    const raw = [
      "From: sender@example.com",
      "To: recipient@example.com",
      "Subject: Nested multipart",
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/related; boundary="outer"`,
      "",
      "--outer",
      `Content-Type: multipart/alternative; boundary="inner"`,
      "",
      "--inner",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Plain text version",
      "--inner",
      "Content-Type: text/html; charset=utf-8",
      "",
      "<p>HTML version</p>",
      "--inner--",
      "--outer--",
    ].join("\r\n");

    const result = await parseMime(raw);
    expect(result.textBody).toContain("Plain text version");
    expect(result.htmlBody).toContain("<p>HTML version</p>");
  });
});

describe("parseMime — attachments", () => {
  it("handles multipart/mixed with an attachment", async () => {
    const fileContent = Buffer.from("fake file content").toString("base64");

    const raw = [
      "From: sender@example.com",
      "To: recipient@example.com",
      "Subject: Email with attachment",
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="mixed-boundary"`,
      "",
      "--mixed-boundary",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "Please find the attachment.",
      "--mixed-boundary",
      'Content-Type: application/pdf; name="report.pdf"',
      "Content-Transfer-Encoding: base64",
      'Content-Disposition: attachment; filename="report.pdf"',
      "",
      fileContent,
      "--mixed-boundary--",
    ].join("\r\n");

    const result = await parseMime(raw);
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].filename).toBe("report.pdf");
    expect(result.attachments[0].mimeType).toBe("application/pdf");
    expect(result.attachments[0].sizeBytes).toBeGreaterThan(0);
    expect(result.textBody).toContain("Please find the attachment.");
  });
});

describe("parseMime — headers", () => {
  it("flattens custom headers into lowercase string keys", async () => {
    const raw = makeRawEmail({
      extraHeaders: {
        "X-Custom-Header": "custom-value",
        "X-Mailer": "TestMailer/1.0",
      },
    });
    const result = await parseMime(raw);
    expect(result.headers["x-custom-header"]).toBe("custom-value");
    expect(result.headers["x-mailer"]).toBe("TestMailer/1.0");
  });

  it("note: mailparser parses List-Unsubscribe structurally into headers['list']", async () => {
    // mailparser converts List-Unsubscribe into a structured { list: { unsubscribe: ... } }
    // object rather than a plain string. The parseMime output stores it under 'list'.
    // detectNewsletter receives pre-flattened headers from the DB layer, not parseMime output.
    const raw = makeRawEmail({
      extraHeaders: { "List-Unsubscribe": "<mailto:unsub@example.com>" },
    });
    const result = await parseMime(raw);
    // 'list' key holds the structured value; 'list-unsubscribe' is not a separate key
    expect(result.headers["list"]).toBeDefined();
    expect(result.headers["list-unsubscribe"]).toBeUndefined();
  });
});

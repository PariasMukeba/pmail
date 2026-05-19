import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptImapPassword } from "@/lib/skills/crypto/encrypt-imap-password";
import { decryptImapPassword } from "@/lib/skills/crypto/decrypt-imap-password";

describe("encryptImapPassword", () => {
  const SECRET = "test-encryption-secret-32-chars!!";

  beforeEach(() => {
    process.env.ENCRYPTION_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_SECRET;
  });

  it("returns { encrypted, iv, tag } fields", () => {
    const result = encryptImapPassword("my-password");
    expect(result).toHaveProperty("encrypted");
    expect(result).toHaveProperty("iv");
    expect(result).toHaveProperty("tag");
  });

  it("returns hex-encoded strings", () => {
    const result = encryptImapPassword("my-password");
    expect(result.encrypted).toMatch(/^[0-9a-f]+$/);
    expect(result.iv).toMatch(/^[0-9a-f]+$/);
    expect(result.tag).toMatch(/^[0-9a-f]+$/);
  });

  it("IV is 24 hex chars (12 bytes)", () => {
    const result = encryptImapPassword("my-password");
    expect(result.iv).toHaveLength(24);
  });

  it("tag is 32 hex chars (16 bytes)", () => {
    const result = encryptImapPassword("my-password");
    expect(result.tag).toHaveLength(32);
  });

  it("produces unique ciphertext on each call (fresh IV)", () => {
    const r1 = encryptImapPassword("same-password");
    const r2 = encryptImapPassword("same-password");
    expect(r1.iv).not.toBe(r2.iv);
    expect(r1.encrypted).not.toBe(r2.encrypted);
  });

  it("roundtrips: decrypt(encrypt(plaintext)) === plaintext", () => {
    const plaintext = "super-secret-imap-password";
    const encrypted = encryptImapPassword(plaintext);
    const decrypted = decryptImapPassword(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("handles empty string plaintext", () => {
    const result = encryptImapPassword("");
    expect(result.encrypted).toBeDefined();
    const decrypted = decryptImapPassword(result);
    expect(decrypted).toBe("");
  });

  it("handles unicode characters in password", () => {
    const password = "pässwörd-🔐";
    const result = encryptImapPassword(password);
    const decrypted = decryptImapPassword(result);
    expect(decrypted).toBe(password);
  });

  it("throws when ENCRYPTION_SECRET is not set", () => {
    delete process.env.ENCRYPTION_SECRET;
    expect(() => encryptImapPassword("password")).toThrow(/ENCRYPTION_SECRET/);
  });
});

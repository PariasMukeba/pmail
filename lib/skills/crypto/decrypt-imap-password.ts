import * as crypto from "crypto";
import type { EncryptedValue } from "./encrypt-imap-password";

const ALGORITHM = "aes-256-gcm";

/**
 * Decrypt an IMAP password that was encrypted by `encryptImapPassword`.
 *
 * Verifies the GCM authentication tag before returning the plaintext —
 * throws if the ciphertext has been tampered with or if the wrong key is used.
 *
 * @throws Error if `ENCRYPTION_SECRET` is not set.
 * @throws Error if the authentication tag does not match (tampered ciphertext).
 * @sideEffects none
 */
export function decryptImapPassword(encrypted: EncryptedValue): string {
  const key = deriveKey();
  const iv = Buffer.from(encrypted.iv, "hex");
  const tag = Buffer.from(encrypted.tag, "hex");
  const ciphertext = Buffer.from(encrypted.encrypted, "hex");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    iv,
  ) as crypto.DecipherGCM;

  decipher.setAAD(Buffer.from("aire-imap-password", "utf-8"));
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf-8",
  );
}

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_SECRET environment variable is not set.",
    );
  }
  return crypto.createHash("sha256").update(secret, "utf-8").digest();
}

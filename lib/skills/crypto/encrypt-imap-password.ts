import * as crypto from "crypto";

export interface EncryptedValue {
  /** AES-256-GCM ciphertext, hex-encoded. */
  encrypted: string;
  /** 96-bit initialisation vector, hex-encoded. */
  iv: string;
  /** 128-bit GCM authentication tag, hex-encoded. */
  tag: string;
}

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96 bits — recommended for GCM
const TAG_BYTES = 16; // 128 bits

/**
 * Encrypt a plaintext IMAP password using AES-256-GCM.
 *
 * The encryption key is derived from the `ENCRYPTION_SECRET` environment
 * variable via SHA-256 (32 bytes). A fresh random IV is generated for each
 * call, making every ciphertext unique even for identical inputs.
 *
 * Store all three returned fields (`encrypted`, `iv`, `tag`) — all are
 * required for decryption. Never store the plaintext value.
 *
 * @throws Error if `ENCRYPTION_SECRET` is not set in the environment.
 * @sideEffects none (reading env vars is considered non-side-effectful here)
 */
export function encryptImapPassword(plaintext: string): EncryptedValue {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_BYTES);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  cipher.setAAD(Buffer.from("aire-imap-password", "utf-8")); // authenticated context

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);

  return {
    encrypted: ciphertext.toString("hex"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Derive a 32-byte AES key from `ENCRYPTION_SECRET`.
 * SHA-256 of the secret ensures correct key length regardless of secret length.
 */
function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_SECRET environment variable is not set. " +
        "Add it to .env.local before using IMAP encryption.",
    );
  }
  return crypto.createHash("sha256").update(secret, "utf-8").digest();
}

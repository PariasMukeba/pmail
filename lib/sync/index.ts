/**
 * Email sync adapter registry.
 *
 * Call `getProviderAdapter(provider)` with the provider string stored on an
 * `Account` record to obtain the correct `EmailProvider` implementation.
 *
 * Supported providers:
 *   - `"gmail"`     → Gmail REST API adapter
 *   - `"office365"` → Microsoft Graph API adapter
 *   - `"imap"`      → Generic IMAP/SMTP adapter
 *
 * Adapters are loaded via dynamic imports so that IMAP/nodemailer code is
 * excluded from the browser bundle (these adapters run server-side only).
 */

import type { EmailProvider } from "./types";

export type {
  EmailProvider,
  SyncResult,
  EmailData,
  FetchOptions,
  DraftData,
  SentResult,
} from "./types";

/**
 * Return the `EmailProvider` adapter for the given provider string.
 * Uses dynamic imports to keep each adapter out of bundles that don't need it.
 *
 * @throws Error if `provider` is not one of the registered values.
 */
export async function getProviderAdapter(
  provider: string,
): Promise<EmailProvider> {
  switch (provider) {
    case "google":   // NextAuth provider id
    case "gmail": {
      const { gmailAdapter } = await import("./gmail");
      return gmailAdapter;
    }
    case "microsoft-entra-id": // NextAuth provider id
    case "azure-ad":
    case "office365": {
      const { microsoftAdapter } = await import("./microsoft");
      return microsoftAdapter;
    }
    case "credentials": // NextAuth id for IMAP
    case "imap": {
      const { imapAdapter } = await import("./imap");
      return imapAdapter;
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

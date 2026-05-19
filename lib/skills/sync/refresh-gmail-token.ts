import { AuthError } from "../../errors";

export interface GmailTokenResult {
  accessToken: string;
  expiresAt: Date;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
}

/**
 * Exchange a Gmail refresh token for a new access token via Google's OAuth2
 * token endpoint.
 *
 * Throws `AuthError` in two cases:
 * - `retryable: true`  — transient server error (5xx, network failure)
 * - `retryable: false` — refresh token has been revoked or expired (`invalid_grant`)
 *
 * The caller is responsible for encrypting and persisting the returned token.
 * This function intentionally does NOT write to the database — that keeps it
 * testable via `fetch` mocking without a DB connection.
 *
 * @sideEffects network — makes one HTTP POST to accounts.google.com
 */
export async function refreshGmailToken(options: {
  /** Plaintext (already decrypted) refresh token. */
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<GmailTokenResult> {
  const { refreshToken, clientId, clientSecret } = options;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (networkError) {
    throw new AuthError(
      "GMAIL",
      `network_error: ${networkError instanceof Error ? networkError.message : "unknown"}`,
    );
  }

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || data.error) {
    const isRevoked =
      data.error === "invalid_grant" || data.error === "token_revoked";
    throw new AuthError(
      "GMAIL",
      isRevoked
        ? "refresh_token_expired_or_revoked"
        : `token_refresh_failed_${response.status}`,
    );
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

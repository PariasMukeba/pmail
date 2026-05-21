/**
 * Base error class for all Pmail application errors.
 * Carry a machine-readable `code`, structured `context`, and a creation timestamp
 * so that error handlers can log identifiers without logging user content.
 */
export class PmailError extends Error {
  readonly code: string;
  readonly context: Record<string, unknown>;
  readonly timestamp: Date;

  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    // Maintains correct stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** Thrown when a provider sync job fails (network error, quota, bad response). */
export class SyncError extends PmailError {
  constructor(
    readonly accountId: string,
    readonly provider: string,
    message: string,
  ) {
    super("SYNC_ERROR", message, { accountId, provider });
  }
}

/** Thrown when OAuth token exchange, refresh, or validation fails. */
export class AuthError extends PmailError {
  constructor(
    readonly provider: string,
    readonly reason: string,
  ) {
    super("AUTH_ERROR", `Auth failed for ${provider}: ${reason}`, {
      provider,
      reason,
    });
  }
}

/**
 * Thrown by lib/ai/email-ai.ts when a Claude API call fails.
 * `retryable` signals whether callers should attempt a retry or surface a
 * permanent error to the user.
 */
export class AIError extends PmailError {
  constructor(
    readonly operation: string,
    readonly retryable: boolean,
    message: string,
  ) {
    super("AI_ERROR", message, { operation, retryable });
  }
}

/** Thrown when dispatching an email through a provider API fails. */
export class SendError extends PmailError {
  constructor(
    readonly to: string,
    readonly subject: string,
    readonly reason: string,
  ) {
    // Deliberately omit `to` and `subject` from the message string so this
    // error is safe to pass to generic loggers that capture `error.message`.
    super("SEND_ERROR", `Failed to send message: ${reason}`, {
      to,
      subject,
      reason,
    });
  }
}

/** Thrown when a requested resource does not exist in the database. */
export class NotFoundError extends PmailError {
  constructor(
    readonly resource: string,
    readonly id: string,
  ) {
    super("NOT_FOUND", `${resource} not found`, { resource, id });
  }
}

/** Thrown when a request body fails schema validation. */
export class ValidationError extends PmailError {
  constructor(
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super("VALIDATION_ERROR", message, context);
  }
}

/**
 * Generic application error for cases not covered by the typed subclasses.
 * Use sparingly — prefer a specific typed subclass when possible.
 */
export class AppError extends PmailError {
  constructor(
    code: string,
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super(code, message, context);
  }
}

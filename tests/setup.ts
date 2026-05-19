import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

// ── Test environment variables ─────────────────────────────────────────────
// Set before any test modules are imported so skills that read env vars at
// module load time see these values.
process.env.ENCRYPTION_SECRET = "test-encryption-secret-32-chars!!";
process.env.ANTHROPIC_API_KEY = "test-api-key-not-real";
process.env.NEXTAUTH_SECRET = "test-nextauth-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/aire_test";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// ── MSW ───────────────────────────────────────────────────────────────────
// Start the MSW server before all tests. Any HTTP call that doesn't match a
// handler will emit a warning rather than throwing — this lets us catch
// unexpected external calls without blocking the entire suite.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

// Reset handlers after each test so per-test overrides don't bleed over.
afterEach(() => server.resetHandlers());

// Close the server cleanly at the end of the suite.
afterAll(() => server.close());

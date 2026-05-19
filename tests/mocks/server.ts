import { setupServer } from "msw/node";
import { gmailHandlers } from "./gmail-api";
import { microsoftHandlers } from "./microsoft-api";
import { anthropicHandlers } from "./anthropic-api";

/**
 * Unified MSW server for all unit and integration tests.
 * Started in tests/setup.ts — do not start it again in individual test files.
 *
 * To add a per-test override:
 *   server.use(http.get("https://...", () => HttpResponse.json({ error: "down" })));
 * The override is reset after each test by the afterEach in setup.ts.
 */
export const server = setupServer(
  ...gmailHandlers,
  ...microsoftHandlers,
  ...anthropicHandlers,
);

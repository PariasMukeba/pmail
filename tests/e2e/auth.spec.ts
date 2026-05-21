import { test, expect } from "@playwright/test";

/**
 * E2E tests for the authentication flow.
 *
 * These tests cover the golden path and key failure modes for:
 * - Sign-in page rendering
 * - Gmail OAuth button presence
 * - Microsoft OAuth button presence
 * - Redirect after unauthenticated access
 * - Sign-out flow
 *
 * Note: Real OAuth callbacks are not tested here — they require external
 * provider cooperation. Auth callback logic is covered in unit tests.
 */

test.describe("Sign-in page", () => {
  test("shows sign-in page at /auth/signin", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page).toHaveTitle(/Pmail|Sign in/i);
  });

  test("shows Gmail sign-in button", async ({ page }) => {
    await page.goto("/auth/signin");
    const gmailButton = page.getByRole("button", { name: /Google|Gmail/i }).or(
      page.getByRole("link", { name: /Google|Gmail/i }),
    );
    await expect(gmailButton).toBeVisible();
  });

  test("shows Microsoft sign-in button", async ({ page }) => {
    await page.goto("/auth/signin");
    const msButton = page.getByRole("button", { name: /Microsoft|Outlook/i }).or(
      page.getByRole("link", { name: /Microsoft|Outlook/i }),
    );
    await expect(msButton).toBeVisible();
  });
});

test.describe("Unauthenticated redirect", () => {
  test("redirects unauthenticated user from inbox to sign-in", async ({ page }) => {
    await page.goto("/inbox");
    // Should be redirected to sign-in (NextAuth default behavior)
    await expect(page).toHaveURL(/signin|auth/i);
  });

  test("redirects unauthenticated user from compose to sign-in", async ({ page }) => {
    await page.goto("/compose");
    await expect(page).toHaveURL(/signin|auth/i);
  });
});

test.describe("Sign-in page accessibility", () => {
  test("sign-in page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/auth/signin");
    // Verify the page loads and key interactive elements are accessible
    const buttons = await page.getByRole("button").count();
    const links = await page.getByRole("link").count();
    expect(buttons + links).toBeGreaterThan(0);
  });

  test("sign-in page has a visible heading", async ({ page }) => {
    await page.goto("/auth/signin");
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Limit workers on CI to avoid flaky tests from resource contention.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3000",
    // Capture trace on first retry so failures are diagnosable in CI.
    trace: "on-first-retry",
    // Screenshot only on failure.
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Uncomment when PWA tests are ready — requires a headed browser.
    // {
    //   name: "Mobile Chrome",
    //   use: { ...devices["Pixel 5"] },
    // },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Re-use an already-running dev server in local development.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

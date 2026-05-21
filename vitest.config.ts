import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Default environment for all tests. Component tests override per-file via
    // the `@vitest-environment jsdom` docblock comment.
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Coverage is measured only over files that unit/integration/AI tests
      // actually exercise. React components (app/, components/) and files that
      // require live network connections are excluded — they are covered by
      // Playwright E2E tests which run separately.
      include: ["lib/skills/**/*.ts", "lib/errors.ts", "lib/ai/email-ai.ts"],
      exclude: ["node_modules/**", ".next/**", "**/*.config.{ts,js,mjs}"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/ai/**/*.test.ts",
    ],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

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
      // Exclude things that are either stubs, config files, or generated code.
      exclude: [
        "tests/e2e/**",
        "node_modules/**",
        ".next/**",
        "**/*.config.{ts,js}",
        "**/index.ts",              // barrel re-export files — no logic to cover
        "lib/plugins/**/*.ts",      // plugin stubs — intentionally unimplemented
        "scripts/**",
        "prisma/**",
      ],
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

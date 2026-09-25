import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    // Flaky-surface detection: retries run in CI only, so a test that only
    // passes on retry is visible in CI output instead of being absorbed
    // silently into local runs.
    retry: process.env.CI ? 2 : 0,
    exclude: ["**/node_modules/**", "**/e2e/**"],
    reporters: ["default", "json", "junit"],
    outputFile: {
      json: "./test-results/results.json",
      junit: "./test-results/junit.xml",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: ["node_modules/**", "e2e/**", "**/*.config.*", "**/*.d.ts", "components/ui/**"],
      // Floors sit just under the measured baseline (91.6% statements,
      // 94.6% lines). Raise them as coverage improves; never lower them
      // to make a change pass.
      thresholds: {
        statements: 88,
        lines: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})

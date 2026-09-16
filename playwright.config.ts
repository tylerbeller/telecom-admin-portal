import { defineConfig, devices } from "@playwright/test"

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000"
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // CI uploads the JUnit report with the other test results.
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm dev:backend",
      url: `${backendUrl}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "pnpm dev:frontend",
      url: frontendUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
})

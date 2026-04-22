import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for `sell-house-for-free` E4 enrichment E2E specs.
 *
 * Specs run against `next dev` with `ENRICHMENT_DEV_MOCK=true` — fixture
 * scenarios are triggered by magic address strings (`__TIMEOUT__`,
 * `__NOMATCH__`, `__LISTED__`, happy default). No real MLS calls.
 *
 * Hardening beyond E4 scope (secrets, shard matrix, trace-upload) is owned
 * by E8.
 */
const PORT = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3300", 10);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `${BASE_URL}/get-started`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ENRICHMENT_DEV_MOCK: "true",
      NODE_ENV: "development",
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});

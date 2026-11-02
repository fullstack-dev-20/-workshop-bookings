import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the real stack. The Laravel API must already be
 * running (see README); Playwright starts Next.js if it isn't up.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // PLAYWRIGHT_CHANNEL=chrome uses an installed Chrome instead of
      // downloading Playwright's Chromium.
      use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/bookings",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "NODE_ENV=test WEB_ORIGIN=http://127.0.0.1:3100 SESSION_COOKIE_NAME=daify_session npm run dev --workspace @daify/api",
      url: "http://127.0.0.1:4000/api/v1/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `DAIFY_API_URL=http://127.0.0.1:4000 DAIFY_WEB_ORIGIN=http://127.0.0.1:3100 npm run ${process.env.WEB_TEST_PRODUCTION === "true" ? "start" : "dev"} --workspace @daify/web -- --hostname 127.0.0.1 --port 3100`,
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI && process.env.WEB_TEST_PRODUCTION !== "true",
      timeout: 120_000,
    },
  ],
});

import { defineConfig, devices } from "@playwright/test";
import { configureBrowserDatabase } from "./tests/database-environment";

configureBrowserDatabase();
const beta = process.env.WEB_TEST_BETA === "true";

export default defineConfig({
  testDir: "./tests",
  ...(beta ? { testMatch: /(?:foundation|accessibility|i18n|menus|publishing|template-parity|beta)\.spec\.ts$/ } : {}),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    extraHTTPHeaders: { "x-daify-test-client-ip": "192.0.2.10" },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: `${beta ? "" : "NODE_ENV=test BILLING_MODE=sandbox ALLOW_DEV_SEED=true npm run billing:seed --workspace @daify/api && "}NODE_ENV=test BILLING_MODE=${beta ? "disabled" : "sandbox"} ANALYTICS_MODE=${beta ? "disabled" : "local"} ALLOW_DEV_SEED=false PORT=4000 PROXY_SIGNING_KEY=${Buffer.alloc(32, 8).toString("base64")} MFA_ENCRYPTION_KEY=${Buffer.alloc(32, 7).toString("base64")} WEB_ORIGIN=http://127.0.0.1:3100 SESSION_COOKIE_NAME=daify_session npm run ${process.env.WEB_TEST_PRODUCTION === "true" ? "start" : "dev"} --workspace @daify/api`,
      url: "http://127.0.0.1:4000/api/v1/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `NODE_ENV=${process.env.WEB_TEST_PRODUCTION === "true" ? "production" : "development"} PROXY_SIGNING_KEY=${Buffer.alloc(32, 8).toString("base64")} DAIFY_CLIENT_IP_HEADER=x-daify-test-client-ip DAIFY_API_URL=http://127.0.0.1:4000 DAIFY_WEB_ORIGIN=http://127.0.0.1:3100 npm run ${process.env.WEB_TEST_PRODUCTION === "true" ? "start" : "dev"} --workspace @daify/web -- --hostname 127.0.0.1 --port 3100`,
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

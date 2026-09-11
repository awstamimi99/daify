import { expect, test } from "@playwright/test";

test("marketing shell keeps the DAIFY identity and primary journey", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/DAIFY/);
  await expect(page.getByRole("heading", { level: 1, name: "Your restaurant deserves more than a PDF." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Build your menu/ })).toHaveAttribute("href", "/signup");
  await expect(page.getByText("One menu. Three different moods.")).toBeVisible();
});

test("responsive marketing navigation opens on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Pricing" })).toBeVisible();
});

test("real authentication verifies email, protects dashboard, and logs out", async ({ page, request, browser }) => {
  test.setTimeout(60_000);
  const email = `web-${Date.now()}@example.com`;
  const password = "correct horse battery staple";
  const signup = await request.post("http://127.0.0.1:4000/api/v1/auth/signup", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: { email, displayName: "Web Reviewer", password },
  });
  expect(signup.ok()).toBeTruthy();
  const signupBody = await signup.json() as { verificationToken: string };

  await page.goto(`/verify-email?token=${encodeURIComponent(signupBody.verificationToken)}`);
  await expect(page.getByRole("heading", { name: "Email verified." })).toBeVisible();
  await page.getByRole("link", { name: "Continue to login" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("form")).toHaveAttribute("method", "post");
  await expect(page.locator("form")).toHaveAttribute("action", "/api/auth/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Log in/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: "Welcome, Web." })).toBeVisible();
  await expect(page.getByText("1,284", { exact: true })).toHaveCount(0);
  await page.getByLabel("Restaurant or group name").fill("Web QA Restaurant");
  await page.getByLabel("Short name", { exact: true }).fill(`web-qa-${Date.now()}`);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.getByLabel("Location name").fill("Salmiya Branch");
  await page.getByLabel("Short name", { exact: true }).fill("salmiya");
  await page.getByRole("button", { name: "Add location" }).click();
  await expect(page.getByText("Salmiya Branch", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Salmiya Branch", { exact: true })).toBeVisible();
  if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/dashboard-desktop.png`, fullPage: true });

  // Desktop logout must remain visible; a failed request must not pretend to log out.
  await expect(page.getByRole("button", { name: "Log out", exact: true })).toBeVisible();
  await page.route("**/api/auth/logout", route => route.fulfill({ status: 500, contentType: "application/json", body: '{"detail":"Temporary failure"}' }));
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "couldn’t log you out" })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.unroute("**/api/auth/logout");

  await page.setViewportSize({ width: 390, height: 844 });
  const menuToggle = page.getByRole("button", { name: "Menu", exact: true });
  await expect(page.locator("#dashboard-sidebar")).toHaveAttribute("inert", "");
  await menuToggle.click();
  await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menuToggle).toHaveAttribute("aria-expanded", "false");
  await expect(menuToggle).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await page.goto("/dashboard/restaurant");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /Log in/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/restaurant$/);
  await page.getByRole("link", { name: "Team", exact: true }).click();
  const teammateEmail = `teammate-${Date.now()}@example.com`;
  await page.getByLabel("Teammate’s email").fill(teammateEmail);
  await page.getByLabel("All locations, including future locations").uncheck();
  await page.getByLabel("Salmiya Branch", { exact: true }).check();
  const inviteResponse = page.waitForResponse(response => response.url().endsWith("/invitations") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Send invitation" }).click();
  const invited = await inviteResponse;
  expect(invited.ok()).toBeTruthy();
  const { invitationToken } = await invited.json() as { invitationToken: string };
  await expect(page.getByRole("status").filter({ hasText: "Invitation sent" })).toBeVisible();

  const teammateSignup = await request.post("http://127.0.0.1:4000/api/v1/auth/signup", {
    headers: { Origin: "http://127.0.0.1:3100" }, data: { email: teammateEmail, displayName: "Invited Reviewer", password },
  });
  expect(teammateSignup.ok()).toBeTruthy();
  const { verificationToken } = await teammateSignup.json() as { verificationToken: string };
  const teammateContext = await browser.newContext();
  try {
    const teammate = await teammateContext.newPage();
    await teammate.goto(`http://127.0.0.1:3100/verify-email?token=${encodeURIComponent(verificationToken)}`);
    await expect(teammate.getByRole("heading", { name: "Email verified." })).toBeVisible();
    await teammate.goto(`http://127.0.0.1:3100/accept-invitation?token=${encodeURIComponent(invitationToken)}`);
    await expect(teammate).toHaveURL(/\/login\?next=/);
    await teammate.getByLabel("Email address").fill(teammateEmail);
    await teammate.getByLabel("Password", { exact: true }).fill(password);
    await teammate.getByRole("button", { name: /Log in/ }).click();
    await teammate.getByRole("button", { name: "Accept invitation" }).click();
    await teammate.getByRole("link", { name: "Open workspace" }).click();
    await expect(teammate.getByText("Salmiya Branch", { exact: true })).toBeVisible();
    await expect(teammate.getByRole("link", { name: "Team", exact: true })).toHaveCount(0);
    await expect(teammate.getByRole("link", { name: "Billing", exact: true })).toHaveCount(0);
    await teammate.goto("http://127.0.0.1:3100/dashboard/team");
    await expect(teammate.getByRole("heading", { name: "This table is empty." })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(`Status for ${teammateEmail}`)).toBeVisible();
    if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/team-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("#dashboard-sidebar")).toHaveAttribute("inert", "");
    await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/team-mobile.png`, fullPage: true, animations: "disabled" });
    await page.getByLabel(`Status for ${teammateEmail}`).selectOption("SUSPENDED");
    await page.getByLabel(`Status for ${teammateEmail}`).locator("..").locator("..").getByRole("button", { name: "Save member" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Membership updated" })).toBeVisible();
    await teammate.goto("http://127.0.0.1:3100/dashboard");
    await expect(teammate.getByText("Salmiya Branch", { exact: true })).toHaveCount(0);
  } finally { await teammateContext.close(); }
});

test("dashboard rejects visitors without a server session", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

test("account form cannot submit credentials before JavaScript is ready", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3100/login", { waitUntil: "domcontentloaded" });
    // The production Suspense shell may omit the form entirely without JS.
    // Any rendered password/submit controls must stay disabled in either mode.
    await expect(page.locator('input[name="password"]:enabled')).toHaveCount(0);
    await expect(page.locator('form button[type="submit"]:enabled')).toHaveCount(0);
    for (const form of await page.locator("form").all()) await expect(form).toHaveAttribute("method", "post");
  } finally { await context.close(); }
});

test("Atelier renderer switches to Arabic and RTL through the typed contract", async ({ page }) => {
  await page.goto("/templates/atelier-preview");

  const renderer = page.locator('[data-template="atelier"]');
  await expect(renderer).toHaveAttribute("dir", "ltr");
  await page.getByRole("button", { name: "العربية" }).click();
  await expect(renderer).toHaveAttribute("dir", "rtl");
  await expect(renderer.getByRole("heading", { name: "المقبلات" })).toBeVisible();
});

test("unknown routes use the shared not-found pattern", async ({ page }) => {
  const response = await page.goto("/not-a-daify-route");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This table is empty." })).toBeVisible();
});

const contentRoutes = [
  ["/features", "Features — DAIFY", "Everything between the edit and the scan."],
  ["/templates", "Templates — DAIFY", "A template should feel like your restaurant."],
  ["/pricing", "Pricing — DAIFY", "Start with the menu you need today."],
  ["/about", "About — DAIFY", "Hospitality deserves better digital details."],
  ["/contact", "Contact — DAIFY", "Let’s make your menu feel remarkable."],
  ["/privacy", "Privacy — DAIFY", "Privacy Policy"],
  ["/terms", "Terms — DAIFY", "Terms of Service"],
  ["/cookies", "Cookies — DAIFY", "Cookie Policy"],
] as const;

for (const [route, title, heading] of contentRoutes) {
  test(`${route} has route-specific metadata and content`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveTitle(title);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  });
}

test("contact form validates and completes without transmitting data", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Your name").fill("M1 Reviewer");
  await page.getByLabel("Work email").fill("review@example.com");
  await page.getByLabel("Restaurant or group").fill("DAIFY Test Kitchen");
  await page.getByLabel("What would you like to achieve?").fill("Verify the restored contact journey.");
  await page.getByRole("button", { name: /Send enquiry/ }).click();
  await expect(page.getByRole("status")).toContainText("does not transmit contact data");
});

test("template gallery exposes nine designs and working filters", async ({ page }) => {
  await page.goto("/templates");
  await expect(page.getByText("09 designs in the collection")).toBeVisible();
  await page.getByRole("button", { name: "Fine Dining" }).click();
  await expect(page.getByText("01 designs in the collection")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Atelier" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open React proof/ })).toHaveAttribute("href", "/templates/atelier-preview");
});

test("pricing toggle updates visible plan pricing", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("$10")).toBeVisible();
  await page.getByRole("button", { name: /Yearly/ }).click();
  await expect(page.getByText("$8")).toBeVisible();
  await expect(page.getByText("Billed $96 annually")).toBeVisible();
});

test("mobile footer keeps accessible accordions and back-to-top control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const product = page.getByRole("button", { name: /Product/ });
  await expect(product).toHaveAttribute("aria-expanded", "false");
  await product.click();
  await expect(product).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Features" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Back to top/ })).toBeVisible();
});


test("account proxy rejects cross-origin and form-encoded login requests", async ({ request }) => {
  const crossOrigin = await request.post("/api/auth/login", {
    headers: { Origin: "http://127.0.0.1:8910" },
    form: { email: "attacker@example.com", password: "irrelevant password" },
  });
  expect(crossOrigin.status()).toBe(403);
  expect(crossOrigin.headers()["set-cookie"]).toBeUndefined();
  const noOrigin = await request.post("/api/auth/login", { data: { email: "example@example.com", password: "irrelevant password" } });
  expect(noOrigin.status()).toBe(403);
  const formEncoded = await request.post("/api/auth/login", { headers: { Origin: "http://127.0.0.1:3100" }, form: { email: "example@example.com", password: "irrelevant password" } });
  expect(formEncoded.status()).toBe(415);
});

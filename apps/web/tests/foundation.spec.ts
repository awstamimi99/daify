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

test("authentication shell demonstrates interaction without creating fake services", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Password").fill("foundation-only");
  await page.getByRole("button", { name: /Log in/ }).click();
  await expect(page.getByRole("status")).toContainText("No account or API call was created");
});

test("dashboard navigation reflects the selected UX role", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { level: 1, name: "Good evening, Adam." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Team/ })).toBeVisible();
  await page.getByLabel("View as").selectOption("viewer");
  await expect(page.getByRole("link", { name: /Team/ })).toHaveCount(0);
  await expect(page.getByText("Frontend permission controls are UX—not security.")).toBeVisible();
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

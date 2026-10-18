import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("public language preference persists and switches the document direction", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Choose interface language" }).click();
  await expect(page.getByRole("menu", { name: "Choose interface language" })).toBeVisible();
  await page.getByRole("menuitemradio", { name: "AR العربية" }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("menu", { name: "اختر لغة الواجهة" })).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "مطعمك يستحق أكثر من ملف PDF." })).toBeVisible();
  await expect(page.locator("#main-content").getByRole("link", { name: /ابدأ التجربة المجانية/ })).toBeVisible();

  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "مرحبًا بعودتك." })).toBeVisible();
  await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
});

test("mobile marketing navigation keeps the language control accessible", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(page.getByRole("button", { name: "العربية" })).toBeVisible();
  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.getByRole("navigation", { name: "التنقل الرئيسي" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

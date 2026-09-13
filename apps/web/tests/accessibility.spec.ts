import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const surfaces = [
  { name: "home", route: "/", arabic: false },
  { name: "login", route: "/login", arabic: false },
  { name: "atelier-en", route: "/templates/atelier-preview", arabic: false },
  { name: "atelier-ar", route: "/templates/atelier-preview", arabic: true },
] as const;

for (const width of [1440, 390]) {
  for (const surface of surfaces) {
    test(`${surface.name} stays readable and accessible at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(surface.route);
      if (surface.arabic) {
        await page.getByRole("button", { name: "العربية", exact: true }).click();
        await expect(page.locator('[data-template="atelier"]')).toHaveAttribute("dir", "rtl");
      }
      // Include below-the-fold content and sold-out dishes in the contrast audit.
      await page.evaluate(() => document.fonts.ready);
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (process.env.QA_EVIDENCE_DIR) {
        await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/${surface.name}-${width}-verified.png`, fullPage: true });
      }
    });
  }
}

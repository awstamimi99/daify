import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { apiIdentity } from './api-identity';
import type { DraftMenu } from '@daify/types';

async function checkLayout(page: Page, name: string, info: TestInfo) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: horizontal overflow`).toBe(true);
  const brokenImages = await page.locator('main img').evaluateAll(images => images.filter(image => (image as HTMLImageElement).complete && !(image as HTMLImageElement).naturalWidth).map(image => image.getAttribute('alt')));
  expect(brokenImages, `${name}: broken images`).toEqual([]);
  await page.screenshot({ path: process.env.QA_EVIDENCE_DIR ? `${process.env.QA_EVIDENCE_DIR}/${name}.png` : info.outputPath(`${name}.png`), fullPage: true, animations: 'disabled' });
}

for (const locale of ['en', 'ar']) {
  test(`public design stays intact across pages and phone sizes in ${locale}`, async ({ page }, info) => {
    test.setTimeout(180_000);
    await page.context().addCookies([{ name: 'daify_locale', value: locale, url: 'http://127.0.0.1:3100' }]);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/', '/features', '/templates', '/pricing', '/about', '/contact', '/login', '/signup']) {
        await page.goto(route);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('.language-switcher')).toBeVisible();
        await checkLayout(page, `${route.replaceAll('/', '') || 'home'}-${locale}-${width}`, info);
        if (width === 390) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations, `${route} ${locale}`).toEqual([]);
      }
    }
    await page.goto('/');
    const heading = await page.locator('h1').evaluate(element => ({ font: getComputedStyle(element).fontFamily, lineHeight: parseFloat(getComputedStyle(element).lineHeight), size: parseFloat(getComputedStyle(element).fontSize) }));
    if (locale === 'ar') { expect(heading.font).toContain('Noto Kufi Arabic'); expect(heading.lineHeight / heading.size).toBeGreaterThanOrEqual(1.5); }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  });
}

test('real dashboard pages preserve layout and header language control in both directions', async ({ page }, info) => {
  test.setTimeout(180_000);
  const ip = '192.0.2.231', stamp = randomUUID(), password = 'correct horse battery staple';
  await page.context().setExtraHTTPHeaders({ 'x-daify-test-client-ip': ip });
  async function post<T>(path: string, data: object): Promise<T> {
    const response = await page.request.post(`http://127.0.0.1:4000/api/v1${path}`, { headers: apiIdentity(path, ip), data });
    expect(response.ok()).toBeTruthy();
    return response.json() as Promise<T>;
  }
  const account = await post<{ verificationToken: string }>('/auth/signup', { email: `design-${stamp}@example.com`, password, displayName: 'Design Reviewer' });
  await post('/auth/verify-email', { token: account.verificationToken });
  await post('/auth/login', { email: `design-${stamp}@example.com`, password });
  const organization = await post<{ id: string }>('/organizations', { name: 'Oliva Design Review', slug: `design-${stamp}` });
  const location = await post<{ id: string }>(`/organizations/${organization.id}/locations`, { name: 'Salmiya', slug: 'salmiya', currency: 'KWD', timezone: 'Asia/Kuwait', defaultLanguage: 'en' });
  const base = `/organizations/${organization.id}/locations/${location.id}/menus`;
  let menu = await post<DraftMenu>(base, { name: 'Dinner', slug: 'dinner', defaultLanguage: 'en', supportedLanguages: ['en', 'ar'], translations: [{ languageTag: 'en', name: 'Dinner', description: '' }, { languageTag: 'ar', name: 'العشاء', description: '' }] });
  menu = await post<DraftMenu>(`${base}/${menu.id}/sections`, { revision: menu.draftRevision, translations: [{ languageTag: 'en', name: 'Starters', description: '' }, { languageTag: 'ar', name: 'المقبلات', description: '' }] });
  await post(`${base}/${menu.id}/sections/${menu.sections[0]!.id}/items`, { revision: menu.draftRevision, translations: [{ languageTag: 'en', name: 'Seasonal soup', description: '' }, { languageTag: 'ar', name: 'شوربة الموسم', description: '' }], price: '2.500', isAvailable: true, isFeatured: false, allergens: [], dietaryTags: [] });
  for (const [localeIndex, locale] of ['en', 'ar'].entries()) {
    await page.context().addCookies([{ name: 'daify_locale', value: locale, url: 'http://127.0.0.1:3100' }]);
    // A new document initializes the provider from the persisted preference.
    await page.goto('/dashboard');
    for (const [viewportIndex, width] of [1440, 390, 320].entries()) {
      await page.context().setExtraHTTPHeaders({ 'x-daify-test-client-ip': `192.0.2.${232 + localeIndex * 3 + viewportIndex}` });
      await page.setViewportSize({ width, height: 900 });
      for (const section of ['', '/restaurant', '/menus', '/design', '/publish', '/team', '/security', '/billing', '/support', '/offers', '/analytics']) {
        await page.goto(`/dashboard${section}`);
        await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
        await expect(page.locator('header .language-switcher')).toBeVisible();
        if (section === '/design' || section === '/publish') {
          await page.getByRole('combobox', { name: locale === 'ar' ? 'القائمة' : 'Menu', exact: true }).selectOption(menu.id);
          await expect(page.locator('iframe')).toBeVisible();
        }
        await checkLayout(page, `dashboard${section.replaceAll('/', '-')}-${locale}-${width}`, info);
      }
    }
  }
});

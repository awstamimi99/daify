import { apiIdentity } from './api-identity';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHmac, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import type { AnalyticsReport, DraftMenu } from '@daify/types';

function code(secret: string) {
  const bits = [...secret].map(char => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char).toString(2).padStart(5, '0')).join('');
  const key = Buffer.from(bits.match(/.{8}/g)!.map(byte => Number.parseInt(byte, 2))), input = Buffer.alloc(8);
  input.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', key).update(input).digest(), offset = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}
function testDatabase() {
  const address = process.env.TEST_DATABASE_URL;
  if (!address || !/(^|[_-])test($|[_-])/i.test(new URL(address).pathname.slice(1))) throw new Error('An explicitly disposable TEST_DATABASE_URL is required.');
  return new Pool({ connectionString: address });
}

test('operator directories, suspension and audit viewer work in English and Arabic', async ({ page }) => {
  await page.context().setExtraHTTPHeaders({ 'x-daify-test-client-ip': '192.0.2.120' });
  const base = 'http://127.0.0.1:4000/api/v1', stamp = randomUUID();
  const email = `operator-${stamp}@example.com`, password = 'correct horse battery staple';
  const post = async <T,>(path: string, data: object): Promise<T> => { const response = await page.request.post(base + path, { headers: apiIdentity(path, '192.0.2.120'), data }); expect(response.ok(), await response.text()).toBeTruthy(); return await response.json() as T; };
  const account = await post<{ user: { id: string }; verificationToken: string }>('/auth/signup', { email, password, displayName: 'M7 Operator' });
  await post('/auth/verify-email', { token: account.verificationToken }); await post('/auth/login', { email, password });
  const organization = await post<{ id: string }>('/organizations', { name: 'Operator Test Kitchen', slug: `operator-${stamp}` });
  await page.goto('/admin'); await expect(page).toHaveURL(/\/dashboard$/);
  const setup = await post<{ secret: string }>('/auth/mfa/setup', { password }); await post('/auth/mfa/confirm', { password, code: code(setup.secret) });
  const database = testDatabase();
  try {
    // Fixture-only promotion: production promotion stays operator CLI-only.
    await database.query('UPDATE users SET "platformAdmin" = true WHERE id = $1', [account.user.id]);
    await page.goto('/admin'); await expect(page.getByRole('heading', { name: 'Platform workspace.' })).toBeVisible();
    await page.getByLabel('Access reason', { exact: true }).fill('Investigating browser support case');
    await page.getByLabel('Search name or identifier').fill(`operator-${stamp}`);
    await page.getByRole('button', { name: 'Load records', exact: true }).click();
    await expect(page.getByText('Operator Test Kitchen', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Suspend organization' }).click();
    await page.getByLabel('Change reason', { exact: true }).fill('Temporary suspension for browser verification');
    await page.getByRole('button', { name: 'Confirm change' }).click();
    await expect(page.getByRole('status')).toContainText('Status updated');
    expect((await page.request.get(`${base}/organizations/${organization.id}`)).status()).toBe(404);
    await page.getByRole('button', { name: 'Restore organization' }).click();
    await page.getByLabel('Change reason', { exact: true }).fill('Restore workspace after browser verification');
    await page.getByRole('button', { name: 'Confirm change' }).click();
    await expect(page.getByRole('button', { name: 'Suspend organization' })).toBeVisible();
    await page.getByRole('button', { name: 'Audit log', exact: true }).click();
    await page.getByLabel('Search reason', { exact: true }).fill('browser verification');
    await page.getByLabel('Organization ID (optional)').fill(organization.id);
    await page.getByRole('button', { name: 'Load records', exact: true }).click();
    await expect(page.getByText('Restore workspace after browser verification', { exact: true })).toBeVisible();
    expect((await page.request.get('/api/platform/auth/me')).status()).toBe(404);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/admin-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'العربية', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'إدارة المنصة.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/admin-mobile-ar.png`, fullPage: true });
  } finally { await database.query('UPDATE users SET "platformAdmin" = false WHERE id = $1', [account.user.id]); await database.end(); }
});

test('guest menu events and QR redirects feed scoped daily reports without counting previews', async ({ page, browser }) => {
  test.setTimeout(90000);
  await page.context().setExtraHTTPHeaders({ 'x-daify-test-client-ip': '192.0.2.121' });
  const origin = 'http://127.0.0.1:3100', api = 'http://127.0.0.1:4000/api/v1', stamp = randomUUID();
  const email = `analytics-${stamp}@example.com`, password = 'correct horse battery staple';
  const post = async <T,>(path: string, data: object): Promise<T> => { const response = await page.request.post(api + path, { headers: apiIdentity(path, '192.0.2.121'), data }); expect(response.ok(), await response.text()).toBeTruthy(); return await response.json() as T; };
  const account = await post<{ verificationToken: string }>('/auth/signup', { email, password, displayName: 'Analytics Owner' });
  await post('/auth/verify-email', { token: account.verificationToken }); await post('/auth/login', { email, password });
  const organization = await post<{ id: string }>('/organizations', { name: 'Analytics Kitchen', slug: `analytics-${stamp}` });
  const location = await post<{ id: string }>(`/organizations/${organization.id}/locations`, { name: 'City', slug: 'city', currency: 'KWD', timezone: 'Asia/Kuwait', defaultLanguage: 'en' });
  const base = `/organizations/${organization.id}/locations/${location.id}/menus`, translations = (name: string) => [{ languageTag: 'en', name, description: '' }, { languageTag: 'ar', name: 'قائمة الطعام', description: '' }];
  let menu = await post<DraftMenu>(base, { name: 'Dinner', slug: 'dinner', defaultLanguage: 'en', supportedLanguages: ['en', 'ar'], translations: translations('Dinner') });
  menu = await post<DraftMenu>(`${base}/${menu.id}/sections`, { revision: menu.draftRevision, translations: translations('Starters') });
  menu = await post<DraftMenu>(`${base}/${menu.id}/sections/${menu.sections[0]!.id}/items`, { revision: menu.draftRevision, translations: translations('Soup'), price: '2.000', isAvailable: true, isFeatured: false, allergens: [], dietaryTags: [] });
  const slug = `guest-${stamp}`;
  await post(`${base}/${menu.id}/publish`, { revision: menu.draftRevision, idempotencyKey: randomUUID(), slug, visibility: 'PUBLIC' });
  await page.goto(`/menu-preview/${organization.id}/${location.id}/${menu.id}`);
  expect(await page.locator('#menu-data').textContent()).not.toContain('"analytics"');
  await page.goto(`/r/${slug}`); expect(await page.locator('#menu-data').textContent()).not.toContain('"analytics"');
  const guestContext = await browser.newContext({ userAgent: 'Mozilla/5.0 DAIFY Guest QA', extraHTTPHeaders: { 'x-daify-test-client-ip': '192.0.2.122' } });
  try {
    const guest = await guestContext.newPage();
    await guest.goto(`${origin}/q/${slug}`); await expect(guest).toHaveURL(`${origin}/r/${slug}`);
    await guest.locator('[data-menu-item]').first().click();
    const database = testDatabase();
    try { await expect.poll(async () => Number((await database.query('SELECT count(*) FROM analytics_events WHERE "menuId" = $1 AND kind = $2', [menu.id, 'MENU_VIEW'])).rows[0].count)).toBe(1); }
    finally { await database.end(); }
    await promisify(execFile)('npm', ['run', 'analytics:aggregate', '--workspace', '@daify/api'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test', ANALYTICS_MODE: 'local', DATABASE_URL: process.env.TEST_DATABASE_URL }, timeout: 30000 });
    const report = await (await page.request.get(`/api/analytics/${organization.id}`)).json() as AnalyticsReport;
    expect(report.totals.MENU_VIEW).toBe(1); expect(report.totals.QR_REDIRECT).toBe(1);
    await page.goto('/dashboard/analytics'); await expect(page.getByRole('heading', { name: 'Menu analytics.' })).toBeVisible();
    await expect(page.getByRole('img', { name: /Daily menu views/ })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/analytics-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'العربية', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'إحصاءات القائمة.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/analytics-mobile-ar.png`, fullPage: true });
  } finally { await guestContext.close(); }
});

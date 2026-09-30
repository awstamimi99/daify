import { apiIdentity } from './api-identity';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHmac, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import type { AnalyticsReport, DraftMenu } from '@daify/types';

async function evidence(page: Page, name: string) {
  if (!process.env.QA_EVIDENCE_DIR) return;
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/${name}.png`, fullPage: true, animations: 'disabled' });
}

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
    await evidence(page, 'admin-desktop');
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'العربية', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'إدارة المنصة.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(page, 'admin-mobile-ar');
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
    await evidence(page, 'analytics-desktop');
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'العربية', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'إحصاءات القائمة.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(page, 'analytics-mobile-ar');
  } finally { await guestContext.close(); }
});

test('operator billing and support replies persist with private in-app notifications', async ({ page, browser }) => {
  test.setTimeout(120000);
  const api = 'http://127.0.0.1:4000/api/v1', origin = 'http://127.0.0.1:3100', stamp = randomUUID(), password = 'correct horse battery staple';
  await page.context().setExtraHTTPHeaders({ 'x-daify-test-client-ip': '192.0.2.130' });
  const operatorContext = await browser.newContext({ extraHTTPHeaders: { 'x-daify-test-client-ip': '192.0.2.131' } }), operator = await operatorContext.newPage();
  const database = testDatabase(); let operatorId: string | undefined;
  const post = async <T,>(target: typeof page, ip: string, path: string, data: object): Promise<T> => {
    const response = await target.request.post(api + path, { headers: apiIdentity(path, ip), data }); expect(response.ok(), await response.text()).toBeTruthy(); return await response.json() as T;
  };
  try {
    for (const [target, ip, email] of [[page, '192.0.2.130', `support-owner-${stamp}@example.com`], [operator, '192.0.2.131', `support-operator-${stamp}@example.com`]] as const) {
      const account = await post<{ user: { id: string }; verificationToken: string }>(target, ip, '/auth/signup', { email, password, displayName: 'Support QA' });
      await post(target, ip, '/auth/verify-email', { token: account.verificationToken }); await post(target, ip, '/auth/login', { email, password });
      const setup = await post<{ secret: string }>(target, ip, '/auth/mfa/setup', { password }); await post(target, ip, '/auth/mfa/confirm', { password, code: code(setup.secret) });
      if (target === operator) operatorId = account.user.id;
    }
    const organization = await post<{ id: string }>(page, '192.0.2.130', '/organizations', { name: 'Support Workflow Kitchen', slug: `support-${stamp}` });
    await database.query('UPDATE users SET "platformAdmin" = true WHERE id = $1', [operatorId]);
    await operator.goto(`${origin}/admin`); await operator.getByRole('button', { name: 'Billing & templates', exact: true }).click();
    await operator.getByRole('button', { name: 'Plans', exact: true }).click();
    await operator.getByLabel('Billing access reason').fill('Testing sandbox billing support workflow');
    await operator.getByLabel('Search billing records').fill(`qa-${stamp}`);
    await operator.getByRole('button', { name: 'Load billing records' }).click();
    await operator.getByRole('button', { name: 'Create plan version' }).click();
    await operator.getByLabel('Plan code', { exact: true }).fill(`qa-${stamp}`);
    await operator.getByLabel('English name').fill('Workflow Plan'); await operator.getByLabel('Arabic name').fill('باقة التحقق');
    await operator.getByLabel('Monthly price (KWD)').fill('4.500');
    await operator.getByLabel('Change reason', { exact: true }).fill('Create isolated workflow plan version');
    expect((await new AxeBuilder({ page: operator }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(operator, 'admin-plan-form-desktop');
    await operator.setViewportSize({ width: 390, height: 844 }); await operator.getByRole('button', { name: 'العربية', exact: true }).click();
    expect(await operator.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page: operator }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(operator, 'admin-plan-form-mobile-ar');
    await operator.getByRole('button', { name: 'English', exact: true }).click(); await operator.setViewportSize({ width: 1280, height: 900 });
    await operator.getByRole('button', { name: 'Save billing change' }).click();
    await expect(operator.getByRole('status')).toHaveText('Change saved and audited.');
    await operator.getByRole('button', { name: 'Retire plan', exact: true }).click();
    await operator.getByLabel('Change reason', { exact: true }).fill('Verify reversible plan availability');
    await operator.getByRole('button', { name: 'Confirm plan change' }).click();
    await expect(operator.getByRole('button', { name: 'Activate plan', exact: true })).toBeVisible();
    await operator.getByRole('button', { name: 'Activate plan', exact: true }).click();
    await operator.getByLabel('Change reason', { exact: true }).fill('Restore isolated plan for enrollment');
    await operator.getByRole('button', { name: 'Confirm plan change' }).click();
    await expect(operator.getByRole('button', { name: 'Retire plan', exact: true })).toBeVisible();
    const billing = await (await page.request.get(`${api}/organizations/${organization.id}/billing`)).json() as import('@daify/types').BillingState;
    const plan = billing.plans.find(value => value.code === `qa-${stamp}`)!; expect(plan).toBeTruthy();
    await post(page, '192.0.2.130', `/organizations/${organization.id}/billing/trial`, { planId: plan.id });
    await operator.getByRole('button', { name: 'Subscriptions', exact: true }).click();
    await operator.getByLabel('Search billing records').fill(`support-${stamp}`);
    await operator.getByRole('button', { name: 'Load billing records' }).click();
    await operator.getByRole('button', { name: 'Set temporary limits' }).click();
    await operator.getByLabel('Menu limit', { exact: true }).fill('3');
    await operator.getByLabel('Expires at (your local time)').fill(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16));
    await operator.getByLabel('Change reason', { exact: true }).fill('Temporary capacity for support investigation');
    await operator.getByRole('button', { name: 'Save billing change' }).click();
    await expect(operator.getByRole('status')).toHaveText('Change saved and audited.');
    const updated = await (await page.request.get(`${api}/organizations/${organization.id}/billing`)).json() as import('@daify/types').BillingState; expect(updated.limits?.menus).toBe(3);
    await operator.getByRole('button', { name: 'Templates', exact: true }).click(); await operator.getByRole('button', { name: 'Load billing records' }).click();
    await expect(operator.getByRole('link', { name: 'Preview template' })).toHaveCount(9);
    expect((await new AxeBuilder({ page: operator }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(operator, 'admin-billing-desktop');
    await operator.setViewportSize({ width: 390, height: 844 }); await operator.getByRole('button', { name: 'العربية', exact: true }).click();
    expect(await operator.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page: operator }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(operator, 'admin-billing-mobile-ar');
    await operator.getByRole('button', { name: 'English', exact: true }).click(); await operator.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/dashboard/support'); await page.getByText('New support request', { exact: true }).click();
    await page.getByLabel('Subject', { exact: true }).fill(`Question ${stamp}`);
    await page.getByLabel('Describe the issue').fill('Please review <script>window.supportInjected=true</script> as plain text.');
    await page.getByRole('button', { name: 'Send request', exact: true }).click(); await expect(page.getByRole('status')).toHaveText('Support request sent.');
    expect(await page.evaluate(() => 'supportInjected' in window)).toBe(false);
    await operator.getByRole('button', { name: 'Support', exact: true }).click();
    await operator.getByLabel('Support access reason').fill('Responding to the isolated support QA ticket');
    await operator.getByLabel('Search tickets').fill(stamp); await operator.getByRole('button', { name: 'Load tickets', exact: true }).click();
    await operator.getByRole('button', { name: 'Open conversation', exact: true }).click();
    await operator.getByLabel('Reply', { exact: true }).fill('Your menu is ready. القائمة جاهزة للنشر.'); await operator.getByRole('button', { name: 'Send reply', exact: true }).click();
    await expect(operator.getByRole('status')).toHaveText('Reply sent.');
    expect((await new AxeBuilder({ page: operator }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(operator, 'admin-support-desktop');
    await operator.setViewportSize({ width: 390, height: 844 }); await operator.getByRole('button', { name: 'العربية', exact: true }).click();
    expect(await operator.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page: operator }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(operator, 'admin-support-mobile-ar');
    await page.getByRole('button', { name: 'Load tickets', exact: true }).click();
    await expect(page.getByText('Support replied to your ticket.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'View conversation', exact: true }).click();
    await expect(page.getByText('Your menu is ready. القائمة جاهزة للنشر.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mark as read', exact: true }).click(); await expect(page.getByText('You’re all caught up.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close ticket', exact: true }).click(); await expect(page.getByRole('button', { name: 'Reopen ticket', exact: true })).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(page, 'support-desktop');
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'العربية', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    await evidence(page, 'support-mobile-ar');
    expect((await page.request.get(`/api/support/${organization.id}/platform/users`)).status()).toBe(404);
    expect((await operator.request.post('/api/platform/billing/auth/signup', { data: {} })).status()).toBe(404);
  } finally {
    if (operatorId) await database.query('UPDATE users SET "platformAdmin" = false WHERE id = $1', [operatorId]);
    await database.end(); await operatorContext.close();
  }
});

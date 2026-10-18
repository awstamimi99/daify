import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { apiIdentity } from './api-identity';

test('Beta billing shows free access in both languages and refuses payment mutations', async ({ page }) => {
  test.skip(process.env.WEB_TEST_BETA !== 'true', 'Runs with billing and analytics disabled in test:beta.');
  const ip = '192.0.2.150', stamp = randomUUID();
  const email = `beta-${stamp}@example.com`, password = 'correct horse battery staple';
  const post = (path: string, data: object) => page.request.post(`http://127.0.0.1:4000/api/v1${path}`, { headers: apiIdentity(path, ip), data });
  const signup = await post('/auth/signup', { email, password, displayName: 'Beta Owner' });
  expect(signup.status()).toBe(201);
  const { verificationToken } = await signup.json() as { verificationToken: string };
  expect((await post('/auth/verify-email', { token: verificationToken })).ok()).toBe(true);
  expect((await post('/auth/login', { email, password })).ok()).toBe(true);
  const created = await post('/organizations', { name: 'Beta Kitchen', slug: `beta-${stamp}` });
  expect(created.status()).toBe(201);
  const { id } = await created.json() as { id: string };
  await page.context().setExtraHTTPHeaders({ 'x-daify-test-client-ip': ip });
  const state = await page.request.get(`/api/billing/${id}`);
  expect(state.status()).toBe(200);
  expect(await state.json()).toMatchObject({ mode: 'disabled', providerReady: false, enrolled: false, limits: null, checkouts: [] });
  // Even a direct forged UI request must fail at the API, before provider calls.
  for (const [action, body] of [['trial', { planId: randomUUID() }], ['checkout', { planId: randomUUID(), idempotencyKey: randomUUID() }], ['cancel', {}]] as const) {
    expect((await post(`/organizations/${id}/billing/${action}`, body)).status()).toBe(503);
  }
  await page.goto('/dashboard/billing');
  await expect(page.getByText('Beta access · no charges', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start sandbox trial|Create test payment/ })).toHaveCount(0);
  await expect(page.getByText('Start a 14-day sandbox trial to test plan limits.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Refresh status' }).click();
  await expect(page.getByRole('status')).toHaveText('Billing status updated.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(page.getByText('وصول تجريبي · بدون رسوم', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'فتح القوائم', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  const after = await page.request.get(`/api/billing/${id}`);
  expect(await after.json()).toMatchObject({ enrolled: false, checkouts: [] });
});

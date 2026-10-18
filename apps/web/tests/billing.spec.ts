import { apiIdentity } from './api-identity';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHmac } from 'node:crypto';
import type { BillingState } from '@daify/types';

function code(secret: string) {
  const bits = [...secret].map(char => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char).toString(2).padStart(5, '0')).join('');
  const key = Buffer.from(bits.match(/.{8}/g)!.map(byte => Number.parseInt(byte, 2)));
  const input = Buffer.alloc(8); input.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', key).update(input).digest(), offset = digest[digest.length - 1]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}

test('sandbox billing requires MFA, enrolls a real workspace and keeps cancellation and Arabic mobile accessible', async ({ page }) => {
  await page.context().setExtraHTTPHeaders({ 'x-daify-test-client-ip': '192.0.2.100' });
  const api = 'http://127.0.0.1:4000/api/v1';
  const email = `billing-${Date.now()}@example.com`, password = 'correct horse battery staple';
  async function post<T>(path: string, data: object): Promise<T> {
    const response = await page.request.post(api + path, { headers: apiIdentity(path, '192.0.2.100'), data });
    expect(response.ok(), await response.text()).toBeTruthy(); return await response.json() as T;
  }
  const signup = await post<{ verificationToken: string }>('/auth/signup', { email, password, displayName: 'Billing Owner' });
  await post('/auth/verify-email', { token: signup.verificationToken }); await post('/auth/login', { email, password });
  const organization = await post<{ id: string }>('/organizations', { name: 'Sandbox Kitchen', slug: `billing-${Date.now()}` });
  await page.goto('/dashboard/billing');
  await expect(page.getByRole('heading', { name: 'Billing & plans.' })).toBeVisible();
  await expect(page.getByText('Sandbox · no real charges')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start sandbox trial' }).first()).toBeDisabled();
  const setup = await post<{ secret: string }>('/auth/mfa/setup', { password });
  await post('/auth/mfa/confirm', { password, code: code(setup.secret) });
  await page.reload();
  await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Starter · Sandbox', exact: true }) }).getByRole('button', { name: 'Start sandbox trial' }).click();
  await expect(page.getByRole('status')).toHaveText('Billing status updated.');
  await expect(page.getByRole('heading', { name: 'Not enrolled', exact: true })).toHaveCount(0);
  const billing = await (await page.request.get(`/api/billing/${organization.id}`)).json() as BillingState;
  expect(billing.subscription?.status).toBe('TRIAL'); expect(billing.limits?.menus).toBe(1); expect(billing.usage.members).toBe(1);
  // The proxy is an allowlist, including protection against platform-path injection.
  expect((await page.request.post(`/api/billing/${organization.id}/platform/billing/plans`, { data: {} })).status()).toBe(404);
  await page.getByRole('button', { name: 'Cancel at period end' }).click();
  await expect(page.getByText('Cancellation scheduled. Your content stays saved.')).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  if (process.env.QA_EVIDENCE_DIR) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/billing-desktop.png`, fullPage: true, animations: 'disabled' }); }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'العربية', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'الاشتراك والباقات.' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await expect(page.getByRole('status')).toHaveText('تم تحديث حالة الاشتراك.');
  if (process.env.QA_EVIDENCE_DIR) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/billing-mobile-ar.png`, fullPage: true, animations: 'disabled' }); }
});

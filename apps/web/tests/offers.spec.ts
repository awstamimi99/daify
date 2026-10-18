import { expect, test, type BrowserContext } from '@playwright/test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import AxeBuilder from '@axe-core/playwright';
function database() { const url = process.env.TEST_DATABASE_URL; if (!url || !/(^|[_-])test($|[_-])/i.test(new URL(url).pathname.slice(1))) throw new Error('An isolated TEST_DATABASE_URL is required.'); return new Pool({ connectionString: url }); }
async function identity(db: Pool, context: BrowserContext, org: string, role: 'MANAGER' | 'SALES' | 'CUSTOMER' | 'OWNER') {
  const id = randomUUID(), token = randomBytes(32).toString('hex'), email = `offers-${id}@example.com`;
  await db.query('INSERT INTO users (id,email,status,"passwordHash","platformAdmin","emailVerifiedAt","mfaSecret","updatedAt") VALUES ($1,$2,\'ACTIVE\',\'unused\',$3,now(),\'v1.fixture\',now())', [id, email, role === 'OWNER']);
  await db.query('INSERT INTO sessions (id,"userId","tokenHash","assuranceLevel","expiresAt","absoluteExpiresAt") VALUES ($1,$2,$3,\'AAL2\',now()+interval \'2 days\',now()+interval \'3 days\')', [randomUUID(), id, createHash('sha256').update(token).digest('hex')]);
  if (role === 'CUSTOMER') await db.query('INSERT INTO organization_members (id,"organizationId","userId",role,status,permissions,"allLocations","updatedAt") VALUES ($1,$2,$3,\'OWNER\',\'ACTIVE\',$4,true,now())', [randomUUID(), org, id, []]);
  else if (role !== 'OWNER') await db.query('INSERT INTO platform_staff (id,"userId",email,role,status,permissions,"organizationIds","allOrganizations","invitedById","invitationExpiresAt","updatedAt") VALUES ($1,$2,$3,$4,\'ACTIVE\',$5,$6,false,$2,now()+interval \'7 days\',now())', [randomUUID(), id, email, role, ['customers.read', 'billing.read', 'offers.read', 'offers.create', ...(role === 'MANAGER' ? ['offers.approve', 'staff.manage', 'discounts.manage'] : [])], [org]]);
  await context.addCookies([{ name: 'daify_session', value: token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  return id;
}
async function fixture(db: Pool) {
  const org = randomUUID(), plan = randomUUID(), name = `Offers kitchen ${org.slice(0, 6)}`;
  await db.query('INSERT INTO organizations (id,name,slug,"updatedAt") VALUES ($1,$2,$3,now())', [org, name, org]);
  await db.query('INSERT INTO billing_plans (id,code,version,name,"nameAr",amount,currency,limits) VALUES ($1,$3,1,\'Offer test plan\',\'باقة اختبار العروض\',10.000,\'KWD\',$2)', [plan, { locations: 2, menus: 3, members: 4, templates: ['atelier'], publishing: true }, plan]);
  return { org, plan, name };
}
async function cleanup(db: Pool, users: string[], org: string, plan: string) {
  await db.query('DELETE FROM commercial_acceptances WHERE "organizationId"=$1', [org]);
  await db.query('DELETE FROM pricing_quotes WHERE "organizationId"=$1', [org]);
  await db.query('DELETE FROM discount_coupons WHERE "createdById"=ANY($1::uuid[])', [users]);
  await db.query('DELETE FROM platform_staff WHERE "userId"=ANY($1::uuid[])', [users]);
  await db.query('DELETE FROM security_events WHERE "actorUserId"=ANY($1::uuid[]) OR "organizationId"=$2', [users, org]);
  await db.query('DELETE FROM organization_members WHERE "organizationId"=$1', [org]);
  await db.query('DELETE FROM organizations WHERE id=$1', [org]); await db.query('DELETE FROM billing_plans WHERE id=$1', [plan]);
  await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]); await db.end();
}

test('Sales quote requires Manager approval and customer review before acceptance, with Arabic mobile access', async ({ page, browser }) => {
  const db = database(), { org, plan } = await fixture(db), users: string[] = [];
  const manager = await browser.newContext({ extraHTTPHeaders: { 'x-daify-test-client-ip': '192.0.2.181' } }), customer = await browser.newContext({ extraHTTPHeaders: { 'x-daify-test-client-ip': '192.0.2.182' } });
  try {
    users.push(await identity(db, page.context(), org, 'SALES'), await identity(db, manager, org, 'MANAGER'), await identity(db, customer, org, 'CUSTOMER'));
    await page.goto('/admin/offers'); await page.getByLabel('Reason for accessing offers').fill('Preparing a negotiated customer quote'); await page.getByRole('button', { name: 'Load offers', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Set Sales limits', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Create custom quote', exact: true }).click();
    await page.getByRole('combobox', { name: 'Customer', exact: true }).selectOption(org); await page.getByRole('combobox', { name: 'Base plan', exact: true }).selectOption(plan);
    await page.getByLabel('Monthly price', { exact: true }).fill('7.500'); await page.getByLabel('Offer duration in months').fill('3');
    await page.getByLabel('Redeem or accept before (local time)').fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16)); await page.getByLabel('Reason for this change').fill('Negotiated three months of introductory pricing');
    await page.getByRole('button', { name: 'Review changes', exact: true }).click();
    expect((await db.query('SELECT id FROM pricing_quotes WHERE "organizationId"=$1', [org])).rowCount).toBe(0);
    await page.getByRole('button', { name: 'Confirm and save', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Offer change saved');
    const quote = (await db.query('SELECT id,status FROM pricing_quotes WHERE "organizationId"=$1', [org])).rows[0] as { id: string; status: string }; expect(quote.status).toBe('PENDING');
    const approvals = await manager.newPage(); await approvals.goto('/admin/offers'); await approvals.getByLabel('Reason for accessing offers').fill('Approving the customer negotiated quote'); await approvals.getByRole('button', { name: 'Load offers', exact: true }).click();
    await approvals.getByRole('button', { name: 'Approve', exact: true }).click(); await approvals.getByLabel('Reason for this change').fill('Approved within the manager pricing allowance'); await approvals.getByRole('button', { name: 'Review changes', exact: true }).click(); await approvals.getByRole('button', { name: 'Confirm and save', exact: true }).click(); await expect(approvals.getByRole('status')).toContainText('saved');
    expect((await db.query('SELECT status FROM pricing_quotes WHERE id=$1', [quote.id])).rows[0].status).toBe('APPROVED');
    const recipient = await customer.newPage(); await recipient.goto('/dashboard/offers'); await recipient.getByRole('button', { name: 'Review quote', exact: true }).click();
    const review = recipient.getByRole('heading', { name: 'Confirm these terms', exact: true }).locator('..'); await expect(review).toContainText('7.500'); await expect(review).toContainText('10.000');
    await expect(recipient.getByRole('button', { name: 'Accept offer', exact: true })).toBeDisabled();
    expect((await db.query('SELECT id FROM commercial_acceptances WHERE "organizationId"=$1', [org])).rowCount).toBe(0);
    await recipient.getByRole('checkbox').check(); await recipient.getByRole('button', { name: 'Accept offer', exact: true }).click(); await expect(recipient.getByRole('heading', { name: 'Accepted · awaiting billing activation' })).toBeVisible();
    expect((await db.query('SELECT amount,"renewalAmount",months FROM commercial_acceptances WHERE "organizationId"=$1', [org])).rows[0]).toMatchObject({ amount: '7.500', renewalAmount: '10.000', months: 3 });
    await approvals.setViewportSize({ width: 390, height: 844 }); await approvals.getByRole('button', { name: 'العربية', exact: true }).click(); await expect(approvals.getByRole('heading', { name: 'الكوبونات وعروض الأسعار.' })).toBeVisible();
    expect(await approvals.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    expect((await new AxeBuilder({ page: approvals }).analyze()).violations).toEqual([]);
    if (process.env.QA_EVIDENCE_DIR) await approvals.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/offers-mobile-ar.png`, fullPage: true });
    await recipient.getByRole('button', { name: 'العربية', exact: true }).click(); await expect(recipient.getByRole('heading', { name: 'تم القبول · بانتظار تفعيل الفوترة' })).toBeVisible();
    expect((await new AxeBuilder({ page: recipient }).analyze()).violations).toEqual([]);
    if (process.env.QA_EVIDENCE_DIR) await recipient.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/customer-offer-ar.png`, fullPage: true });
  } finally { await Promise.allSettled([manager.close(), customer.close()]); await cleanup(db, users, org, plan); }
});

test('Manager coupon creation is reviewed and a customer can redeem its exact terms once', async ({ page, browser }) => {
  const db = database(), { org, plan } = await fixture(db), users: string[] = [], customer = await browser.newContext({ extraHTTPHeaders: { 'x-daify-test-client-ip': '192.0.2.183' } });
  const code = `MGR-${randomUUID().slice(0, 8)}`.toUpperCase();
  try {
    users.push(await identity(db, page.context(), org, 'MANAGER'), await identity(db, customer, org, 'CUSTOMER'));
    await page.goto('/admin/offers'); await page.getByLabel('Reason for accessing offers').fill('Creating a six month customer promotion'); await page.getByRole('button', { name: 'Load offers', exact: true }).click();
    await page.getByRole('button', { name: 'Create coupon', exact: true }).click(); await page.getByRole('combobox', { name: 'Customer', exact: true }).selectOption(org); await page.getByLabel('Coupon code', { exact: true }).fill(code); await page.getByLabel('Discount percentage').fill('50'); await page.getByLabel('Offer duration in months').fill('6'); await page.getByLabel('Redeem or accept before (local time)').fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16)); await page.getByLabel('Reason for this change').fill('Approved maximum manager customer promotion');
    await page.getByRole('button', { name: 'Review changes', exact: true }).click(); expect((await db.query('SELECT id FROM discount_coupons WHERE code=$1', [code])).rowCount).toBe(0); await page.getByRole('button', { name: 'Confirm and save', exact: true }).click(); await expect(page.getByRole('status')).toContainText('saved');
    const recipient = await customer.newPage(); await recipient.goto('/dashboard/offers'); await recipient.getByLabel('Coupon code', { exact: true }).fill(code.toLowerCase()); await recipient.getByRole('combobox', { name: 'Plan', exact: true }).selectOption(plan); await recipient.getByRole('button', { name: 'Review coupon', exact: true }).click();
    const review = recipient.getByRole('heading', { name: 'Confirm these terms', exact: true }).locator('..'); await expect(review).toContainText('5.000'); await expect(review).toContainText('10.000'); await expect(review).toContainText('6 months');
    await recipient.getByRole('checkbox').check(); await recipient.getByRole('button', { name: 'Accept offer', exact: true }).click(); await expect(recipient.getByRole('heading', { name: 'Accepted · awaiting billing activation' })).toBeVisible(); expect((await db.query('SELECT "redeemedCount" FROM discount_coupons WHERE code=$1', [code])).rows[0].redeemedCount).toBe(1);
  } finally { await Promise.allSettled([customer.close()]); await cleanup(db, users, org, plan); }
});

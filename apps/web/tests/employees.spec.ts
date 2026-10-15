import { expect, test, type Page } from '@playwright/test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import AxeBuilder from '@axe-core/playwright';
import { apiIdentity } from './api-identity';

function database() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !/(^|[_-])test($|[_-])/i.test(new URL(url).pathname.slice(1))) throw new Error('An isolated TEST_DATABASE_URL is required.');
  return new Pool({ connectionString: url });
}
async function employee(page: Page, db: Pool, owner: boolean, role = 'SUPPORT', organizationIds: string[] = []) {
  const id = randomUUID(), token = randomBytes(32).toString('hex'), email = `employee-${id}@example.com`;
  await db.query('INSERT INTO users (id,email,"displayName",status,"emailVerifiedAt","passwordHash","platformAdmin","mfaSecret","updatedAt") VALUES ($1,$2,$3,\'ACTIVE\',now(),\'unused\',$4,\'v1.fixture\',now())', [id, email, 'Employee browser fixture', owner]);
  await db.query('INSERT INTO sessions (id,"userId","tokenHash","assuranceLevel","expiresAt","absoluteExpiresAt") VALUES ($1,$2,$3,\'AAL2\',now()+interval \'2 days\',now()+interval \'3 days\')', [randomUUID(), id, createHash('sha256').update(token).digest('hex')]);
  if (!owner) await db.query('INSERT INTO platform_staff (id,"userId",email,role,status,permissions,"allOrganizations","organizationIds","invitedById","invitationExpiresAt","updatedAt") VALUES ($1,$2,$3,$4,\'ACTIVE\',$5,false,$6,$2,now()+interval \'7 days\',now())', [randomUUID(), id, email, role, ['customers.read', 'menus.read', 'menus.edit', 'menus.publish', ...(role === 'MANAGER' ? ['staff.manage'] : [])], organizationIds]);
  await page.context().addCookies([{ name: 'daify_session', value: token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  return { id, email };
}
async function clean(db: Pool, userId: string, organizationId?: string) {
  if (organizationId) {
    const menus = '(SELECT m.id FROM menus m JOIN locations l ON l.id=m."locationId" WHERE l."organizationId"=$1)';
    await db.query(`UPDATE menus SET "currentVersionId"=NULL WHERE id IN ${menus}`, [organizationId]);
    for (const table of ['menu_versions', 'menu_routes', 'themes']) await db.query(`DELETE FROM ${table} WHERE "menuId" IN ${menus}`, [organizationId]);
    await db.query(`DELETE FROM menu_items WHERE "sectionId" IN (SELECT id FROM menu_sections WHERE "menuId" IN ${menus})`, [organizationId]);
    await db.query(`DELETE FROM menu_sections WHERE "menuId" IN ${menus}`, [organizationId]);
    await db.query(`DELETE FROM menus WHERE id IN ${menus}`, [organizationId]);
    await db.query('DELETE FROM security_events WHERE "organizationId"=$1', [organizationId]);
    await db.query('DELETE FROM locations WHERE "organizationId"=$1', [organizationId]);
    await db.query('DELETE FROM organizations WHERE id=$1', [organizationId]);
  }
  await db.query('DELETE FROM platform_staff WHERE "invitedById"=$1 OR "userId"=$1', [userId]);
  await db.query('DELETE FROM security_events WHERE "actorUserId"=$1', [userId]);
  await db.query('DELETE FROM users WHERE id=$1', [userId]);
}

test('Owner reviews a custom Manager invitation and Sales menu permissions stay locked in English and Arabic', async ({ page }) => {
  await page.goto('/staff-invitation');
  await expect(page).toHaveURL(/\/login\?next=\/staff-invitation$/);
  const db = database(), user = await employee(page, db, true), inviteEmail = `invited-${randomUUID()}@example.com`;
  try {
    await page.goto('/admin/employees');
    await page.getByLabel('Reason for accessing employee records').fill('Setting up the DAIFY employee team');
    await page.getByRole('button', { name: 'Load employees', exact: true }).click();
    await page.getByRole('button', { name: 'Invite employee', exact: true }).click();
    await page.getByLabel('Employee email', { exact: true }).fill(inviteEmail);
    await page.getByLabel('Role preset').selectOption('SALES');
    await expect(page.getByLabel('Edit client menus and designs', { exact: true })).toBeDisabled();
    await expect(page.getByLabel('Publish, unpublish and roll back client menus', { exact: true })).toBeDisabled();
    await page.getByLabel('Role preset').selectOption('MANAGER');
    await expect(page.getByLabel('Publish, unpublish and roll back client menus', { exact: true })).toBeChecked();
    await page.getByLabel('Publish, unpublish and roll back client menus', { exact: true }).uncheck();
    await page.getByLabel('All customers', { exact: true }).check();
    await page.getByLabel('Reason for this change').fill('Appointing a manager with publishing disabled');
    await page.getByRole('button', { name: 'Review changes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Review before saving' })).toBeVisible();
    expect((await db.query('SELECT id FROM platform_staff WHERE email=$1', [inviteEmail])).rowCount).toBe(0);
    await page.getByRole('button', { name: 'Confirm and save', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Employee access saved');
    const saved = (await db.query('SELECT role,permissions,status FROM platform_staff WHERE email=$1', [inviteEmail])).rows[0] as { role: string; permissions: string[]; status: string };
    expect(saved.role).toBe('MANAGER'); expect(saved.status).toBe('INVITED'); expect(saved.permissions).not.toContain('menus.publish');
    await page.getByRole('button', { name: 'العربية', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'الموظفون والصلاحيات.' })).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('status')).toContainText('تم حفظ صلاحيات الموظف');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/employees-ar.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'دعوة موظف', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'تعديل قوائم العملاء وتصاميمها', exact: true })).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/employee-permissions-mobile-ar.png`, fullPage: true });
  } finally { await clean(db, user.id); await db.end(); }
});

test('Manager cannot appoint Managers; scoped assistance renders previews and ends cleanly', async ({ page }) => {
  const db = database(), org = randomUUID(), location = randomUUID();
  await db.query('INSERT INTO organizations (id,name,slug,"updatedAt") VALUES ($1,\'Staff assistance kitchen\',$2,now())', [org, `staff-${org}`]);
  await db.query('INSERT INTO locations (id,"organizationId",name,slug,timezone,currency,"defaultLanguage","updatedAt") VALUES ($1,$2,\'Main branch\',\'main\',\'Asia/Kuwait\',\'KWD\',\'en\',now())', [location, org]);
  const user = await employee(page, db, false, 'MANAGER', [org]);
  const reason = 'Helping the client prepare their menu';
  await page.context().setExtraHTTPHeaders({ 'x-daify-test-client-ip': '192.0.2.180' });
  try {
    await page.goto('/admin/employees');
    await page.getByLabel('Reason for accessing employee records').fill('Reviewing the team assigned to my customer');
    await page.getByRole('button', { name: 'Load employees', exact: true }).click();
    await page.getByRole('button', { name: 'Invite employee', exact: true }).click();
    await expect(page.getByLabel('Role preset').locator('option[value="MANAGER"]')).toHaveCount(0);
    await expect(page.getByLabel('All customers', { exact: true })).toBeDisabled();
    const escalation = await page.request.post('/api/platform/staff', { headers: { Origin: 'http://127.0.0.1:3100' }, data: { email: `denied-${randomUUID()}@example.com`, role: 'MANAGER', permissions: ['customers.read'], allOrganizations: false, organizationIds: [org], reason } });
    expect(escalation.status()).toBe(403);
    const path = `/organizations/${org}/locations/${location}/menus`;
    const result = await page.request.post(`http://127.0.0.1:4000/api/v1${path}`, { headers: { ...apiIdentity(path, '192.0.2.180'), 'x-support-reason': reason }, data: { name: 'Assisted menu', slug: randomUUID(), defaultLanguage: 'en', supportedLanguages: ['en'], translations: [{ languageTag: 'en', name: 'Assisted menu', description: '' }] } });
    expect(result.ok(), await result.text()).toBeTruthy();
    await page.goto('/admin/assistance');
    await page.getByLabel('Support reason · سبب المساعدة').fill(reason);
    await page.getByRole('button', { name: 'Find assigned customers · عرض العملاء' }).click();
    await page.getByRole('button', { name: 'Start assistance · بدء المساعدة' }).click();
    await expect(page.getByRole('heading', { name: 'Staff assistance kitchen' })).toBeVisible();
    await expect(page.getByText('Assisted menu', { exact: true })).toBeVisible();
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Design · التصميم', exact: true }).click();
    await page.getByRole('combobox', { name: 'Menu', exact: true }).selectOption({ label: 'Assisted menu' });
    await expect(page.getByTitle('Menu preview')).toBeVisible();
    await expect(page.frameLocator('iframe[title="Menu preview"]').locator('body')).not.toContainText('Menu unavailable');
    if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/employee-assistance.png`, fullPage: true });
    await page.getByRole('button', { name: 'Finish assistance · إنهاء المساعدة' }).click();
    await expect(page.getByLabel('Support reason · سبب المساعدة')).toBeVisible();
    expect((await page.request.get(`/api/menus/${org}/${location}`)).status()).toBe(400);
  } finally { await clean(db, user.id, org); await db.end(); }
});

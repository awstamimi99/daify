/* Local-only exploratory regression probes. Creates qa-* accounts in the disposable QA DB. */
const { chromium } = require('@playwright/test');
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'evidence/2026-09-12');
const API = 'http://127.0.0.1:4000/api/v1';
const WEB = 'http://127.0.0.1:3100';
const stamp = Date.now();
const password = 'qa disposable password 2026';
const records = [];
const record = (check, data) => { records.push({ check, ...data }); fs.writeFileSync(path.join(out, 'auth-audit.json'), JSON.stringify(records, null, 2)); };
async function req(route, method = 'GET', body, cookie, origin = WEB) {
  const r = await fetch(API + route, { method, headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: r.status === 204 ? null : await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] };
}
async function account(label) {
  const email = `qa-${label}-${stamp}@example.com`;
  const signup = await req('/auth/signup', 'POST', { email, displayName: `QA ${label}`, password });
  if (signup.status !== 201) throw new Error(`Fixture signup failed: ${signup.status}`);
  await req('/auth/verify-email', 'POST', { token: signup.body.verificationToken });
  return { email, id: signup.body.user.id };
}
(async () => {
  const owner = await account('owner');
  const viewer = await account('viewer');
  const login = await req('/auth/login', 'POST', { email: owner.email, password });
  if (login.status !== 200) throw new Error(`Fixture login failed: ${login.status}`);
  const cookie = login.cookie;
  const org = await req('/organizations', 'POST', { name: 'QA Restaurant', slug: `qa-${stamp}` }, cookie);
  const locationA = await req(`/organizations/${org.body.id}/locations`, 'POST', { name: 'Allowed Branch', slug: 'allowed', timezone: 'Asia/Kuwait', currency: 'KWD', defaultLanguage: 'en' }, cookie);
  const locationB = await req(`/organizations/${org.body.id}/locations`, 'POST', { name: 'Restricted Branch', slug: 'restricted', timezone: 'Asia/Kuwait', currency: 'KWD', defaultLanguage: 'en' }, cookie);
  const invite = await req(`/organizations/${org.body.id}/invitations`, 'POST', { email: viewer.email, role: 'VIEWER', allLocations: false, locationIds: [locationA.body.id] }, cookie);
  const viewerLogin = await req('/auth/login', 'POST', { email: viewer.email, password });
  await req('/organizations/invitations/accept', 'POST', { token: invite.body.invitationToken }, viewerLogin.cookie);
  const orgRead = await req(`/organizations/${org.body.id}`, 'GET', undefined, viewerLogin.cookie);
  const forbiddenRead = await req(`/organizations/${org.body.id}/locations/${locationB.body.id}`, 'GET', undefined, viewerLogin.cookie);
  record('location-scope-list-leak', { organizationStatus: orgRead.status, returnedBranches: orgRead.body.locations?.map(l => l.name), restrictedBranchDirectStatus: forbiddenRead.status });
  const db = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55432/daify_qa_test' });
  await db.connect();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(WEB + '/dashboard/menus');
  record('protected-deep-link', { destination: page.url() });
  await page.getByLabel('Email address').fill(owner.email);
  record('password-label', { exactPasswordMatches: await page.getByLabel('Password', { exact: true }).count(), actualLabel: await page.locator('label[for="password"]').innerText() });
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /Log in/ }).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('heading', { name: 'Good evening, QA.' }).waitFor();
  record('login-discards-next', { requested: '/dashboard/menus', landed: new URL(page.url()).pathname });
  record('desktop-logout', { buttonInDom: await page.getByText('Log out', { exact: true }).count(), visible: await page.getByText('Log out', { exact: true }).isVisible() });
  await page.screenshot({ path: path.join(out, 'authenticated-dashboard-desktop.png'), fullPage: true });
  record('wrong-restaurant', { ownOrganization: org.body.name, displaysOliva: await page.getByText('Oliva', { exact: true }).count(), sampleMenuViews: await page.getByText('1,284', { exact: true }).count() });
  for (const section of ['restaurant', 'menus', 'design', 'publish', 'analytics', 'team', 'billing']) {
    await page.goto(WEB + '/dashboard/' + section);
    record('dashboard-section', { section, placeholder: await page.getByText('Structure before simulation.', { exact: true }).count() === 1 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(WEB + '/dashboard');
  const hiddenLink = page.locator('#dashboard-sidebar').getByRole('link', { name: 'Menus', exact: true });
  await hiddenLink.focus();
  record('mobile-offscreen-nav-focus', { focusedOffscreen: await hiddenLink.evaluate(el => document.activeElement === el && el.getBoundingClientRect().right < 0) });
  await page.locator('button[aria-controls="dashboard-sidebar"]').click();
  await page.keyboard.press('Escape');
  record('mobile-nav-escape', { expandedAfterEscape: await page.locator('button[aria-controls="dashboard-sidebar"]').getAttribute('aria-expanded') });
  await page.screenshot({ path: path.join(out, 'authenticated-dashboard-mobile-nav.png'), fullPage: false });
  await page.getByRole('button', { name: 'Close dashboard navigation' }).click();
  await page.route('**/api/auth/logout', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"QA simulated failure"}' }));
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.waitForURL('**/login');
  await page.goto(WEB + '/dashboard');
  record('failed-logout', { destinationAfterReturn: new URL(page.url()).pathname, stillAuthenticated: new URL(page.url()).pathname === '/dashboard' });
  const directBadOrigin = await req('/auth/login', 'POST', { email: owner.email, password }, undefined, 'http://127.0.0.1:8910');
  const proxyBadOrigin = await fetch(WEB + '/api/auth/login', { method: 'POST', headers: { origin: 'http://127.0.0.1:8910', 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email: owner.email, password }) });
  record('auth-proxy-origin', { directApiStatus: directBadOrigin.status, webProxyStatus: proxyBadOrigin.status, webProxySetsSession: !!proxyBadOrigin.headers.get('set-cookie') });
  const selfInvite = await req(`/organizations/${org.body.id}/invitations`, 'POST', { email: owner.email, role: 'VIEWER', allLocations: true }, cookie);
  const selfAccept = await req('/organizations/invitations/accept', 'POST', { token: selfInvite.body.invitationToken }, cookie);
  const owners = await db.query('SELECT count(*)::int AS count FROM organization_members WHERE "organizationId"=$1 AND role=\'OWNER\' AND status=\'ACTIVE\'', [org.body.id]);
  record('last-owner-invitation-bypass', { inviteStatus: selfInvite.status, acceptStatus: selfAccept.status, activeOwnersRemaining: owners.rows[0].count });
  await context.close(); await browser.close(); await db.end();
  console.log(JSON.stringify(records, null, 2));
})().catch(e => { console.error(e); process.exit(1); });

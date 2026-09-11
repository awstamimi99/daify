const { chromium } = require('@playwright/test');
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'evidence/2026-09-12');
(async () => {
  const db = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55432/daify_qa_test' });
  await db.connect();
  const { rows } = await db.query("SELECT email FROM users WHERE email LIKE 'qa-owner-%@example.com' ORDER BY \"createdAt\" DESC LIMIT 1");
  await db.end();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const auth = await context.request.post('http://127.0.0.1:3100/api/auth/login', { data: { email: rows[0].email, password: 'qa disposable password 2026' } });
  if (!auth.ok()) throw new Error('QA login failed: ' + auth.status());
  const page = await context.newPage();
  const results = [];
  const urls = ['http://127.0.0.1:3100/', 'http://127.0.0.1:3100/login', 'http://127.0.0.1:3100/dashboard', 'http://127.0.0.1:3100/templates/atelier-preview', 'http://127.0.0.1:8910/dashboard/menu-builder.html', 'http://127.0.0.1:8910/admin/plans.html'];
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.addScriptTag({ path: require.resolve('axe-core') });
    const result = await page.evaluate(async () => {
      const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: r.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })) };
    });
    results.push({ url, ...result });
  }
  await page.goto('http://127.0.0.1:3100/dashboard', { waitUntil: 'networkidle' });
  const contrast = await page.getByRole('link', { name: 'Open Atelier proof' }).evaluate(el => { const s = getComputedStyle(el); return { color: s.color, background: s.backgroundColor }; });
  results.push({ check: 'dashboard-white-button', ...contrast });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('button[aria-controls="dashboard-sidebar"]').click();
  await page.waitForFunction(() => Math.abs(document.querySelector('#dashboard-sidebar').getBoundingClientRect().x) < 1);
  await page.screenshot({ path: path.join(out, 'authenticated-dashboard-mobile-nav.png'), fullPage: false });
  fs.writeFileSync(path.join(out, 'accessibility-audit.json'), JSON.stringify(results, null, 2));
  console.log(results.map(r => ({ url: r.url, violations: r.violations?.map(v => ({ id: v.id, nodes: v.nodes.length })), check: r.check, color: r.color, background: r.background })));
  await context.close(); await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

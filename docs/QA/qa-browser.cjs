/* Read-only route audit. Uses fresh browser contexts and local servers only. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const output = path.join(__dirname, 'evidence/2026-09-12');

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const prototypeRoutes = ['index.html', 'login.html', 'signup.html', 'template-preview.html', 'template-customizer.html',
    ...['dashboard', 'admin', 'templates'].flatMap(dir => fs.readdirSync(dir).filter(f => f.endsWith('.html')).map(f => `${dir}/${f}`))];
  const webRoutes = ['/', '/features', '/templates', '/pricing', '/about', '/contact', '/privacy', '/terms', '/cookies', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/dashboard', '/admin', '/templates/atelier-preview'];
  for (const [kind, base, routes] of [['prototype', 'http://127.0.0.1:8910/', prototypeRoutes], ['web', 'http://127.0.0.1:3100', webRoutes]]) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      for (const route of routes) {
        const page = await context.newPage();
        const errors = [], badResponses = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400) badResponses.push({ url: r.url(), status: r.status() }); });
        try {
          const response = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 25000 });
          const dom = await page.evaluate(() => ({
            title: document.title, lang: document.documentElement.lang, dir: document.documentElement.dir,
            h1: [...document.querySelectorAll('h1')].map(e => e.textContent.trim()),
            overflow: document.documentElement.scrollWidth > innerWidth + 2,
            widths: [innerWidth, document.documentElement.scrollWidth],
            brokenImages: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.getAttribute('src')),
            unnamedControls: [...document.querySelectorAll('button,input:not([type=hidden]),select,textarea')].filter(e => {
              if (!e.getClientRects().length) return false;
              return !(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.getAttribute('title') || e.labels?.length || (e.tagName === 'BUTTON' && e.textContent.trim()));
            }).map(e => ({ tag: e.tagName, id: e.id, type: e.type })).slice(0, 20),
          }));
          results.push({ kind, width, route, status: response.status(), finalUrl: page.url(), ...dom, errors, badResponses });
          if (route === 'dashboard/index.html' || route === 'dashboard/menu-builder.html' || route === '/login' || dom.overflow || errors.length) {
            await page.screenshot({ path: path.join(output, `${kind}-${width}-${route.replace(/[^a-z0-9]/gi, '_')}.png`), fullPage: false });
          }
        } catch (e) { results.push({ kind, width, route, error: e.message, errors, badResponses }); }
        await page.close();
        fs.writeFileSync(path.join(output, 'route-audit.json'), JSON.stringify(results, null, 2));
      }
      await context.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify({ checked: results.length, problems: results.filter(r => r.error || r.errors?.length || r.overflow || r.badResponses?.length || r.brokenImages?.length) }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });

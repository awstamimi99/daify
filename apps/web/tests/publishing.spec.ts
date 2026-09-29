import { apiIdentity } from './api-identity';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { defaultDesign, templateKeys } from '@daify/menu-engine';
import type { PublicationState } from '@daify/menu-engine';
import type { DraftMenu } from '@daify/types';

for (const template of templateKeys) for (const [width,language] of [[1440,'en'],[390,'ar']] as const) test(`${template} production template renders ${language} at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/templates/${template}/preview?lang=${language}`);
  await expect(page.locator('.restaurant-menu')).toHaveAttribute('data-template',template);
  await expect(page.locator('html')).toHaveAttribute('dir',language === 'ar' ? 'rtl' : 'ltr');
  await expect(page.locator('[data-menu-item]')).toHaveCount(24);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const violations = (await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
  await info.attach('accessibility',{ body:JSON.stringify(violations),contentType:'application/json' });
  expect(violations.map(v => ({ id:v.id,count:v.nodes.length,nodes:v.nodes.slice(0,3).map(n => ({ target:n.target,summary:n.failureSummary })) }))).toEqual([]);
  if (process.env.QA_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/${template}-${language}-${width}.png`, fullPage: true });
  await page.getByRole('searchbox').fill('no matching dishes anywhere');
  await expect(page.locator('[data-menu-item]:visible')).toHaveCount(0); await expect(page.locator('.menu-empty')).toBeVisible();
  await page.getByRole('searchbox').fill('');
  if (template === 'feast') { await page.locator('[data-menu-item]').first().click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible(); }
  await info.attach('template-structure',{ body: JSON.stringify({ template,width,language,items:await page.locator('[data-menu-item]').count() }),contentType:'application/json' });
});

test.use({ actionTimeout: 10_000 });

test('publishes a real menu, customizes its iframe, decodes a stable QR and restores history', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.context().setExtraHTTPHeaders({ 'x-daify-test-client-ip': '192.0.2.90' });
  const origin = 'http://127.0.0.1:3100', apiOrigin = 'http://127.0.0.1:4000/api/v1', stamp = `${Date.now()}-${Math.floor(Math.random()*10000)}`, email = `publish-${stamp}@example.com`, password = 'correct horse battery staple';
  const post = async <T,>(path: string, data: object): Promise<T> => { const response = await page.request.post(`${apiOrigin}${path}`,{ headers: apiIdentity(path, '192.0.2.90'), data }); expect(response.ok(),await response.text()).toBeTruthy(); return await response.json() as T; };
  const signup = await post<{ verificationToken: string }>('/auth/signup',{ email, displayName: 'Publisher', password });
  await post('/auth/verify-email',{ token: signup.verificationToken }); await post('/auth/login',{ email,password });
  const org = await post<{ id: string }>('/organizations',{ name: 'Publishing Kitchen',slug:`publish-${stamp}` });
  const location = await post<{ id: string }>(`/organizations/${org.id}/locations`,{ name:'Kuwait City',slug:'main',timezone:'Asia/Kuwait',currency:'KWD',defaultLanguage:'en' });
  const base = `/organizations/${org.id}/locations/${location.id}/menus`;
  const translations = (name: string, ar: string) => [{ languageTag:'en',name,description:'Fresh from our kitchen.' },{ languageTag:'ar',name:ar,description:'من مطبخنا إلى مائدتكم.' }];
  let menu = await post<DraftMenu>(base,{ name:'Dinner',slug:'dinner',defaultLanguage:'en',supportedLanguages:['en','ar'],translations:translations('Dinner','العشاء') });
  menu = await post<DraftMenu>(`${base}/${menu.id}/sections`,{ revision:menu.draftRevision,translations:translations('Starters','المقبلات') });
  menu = await post<DraftMenu>(`${base}/${menu.id}/sections/${menu.sections[0]!.id}/items`,{ revision:menu.draftRevision,translations:translations('Lentil soup','شوربة العدس'),price:'2.750',isAvailable:true,isFeatured:true,allergens:['milk'],dietaryTags:['vegetarian'] });
  const buffer = await sharp({ create:{ width:480,height:320,channels:3,background:'#d39c47' } }).png().toBuffer();
  menu = await post<DraftMenu>(`${base}/${menu.id}/items/${menu.sections[0]!.items[0]!.id}/images`,{ revision:menu.draftRevision,data:buffer.toString('base64'),mimeType:'image/png',translations:[] });
  await page.goto('/dashboard/design'); await page.getByRole('combobox',{ name:'Menu',exact:true }).selectOption(menu.id);
  const preview = page.frameLocator('iframe[title="Menu preview"]');
  await expect(preview.locator('[data-menu-section]').getByRole('heading',{ name:'Starters' })).toBeVisible();
  await page.getByRole('combobox',{ name:'Template',exact:true }).selectOption('feast'); await expect(preview.locator('.restaurant-menu')).toHaveAttribute('data-family','feast');
  await page.getByRole('combobox',{ name:'Language',exact:true }).selectOption('ar'); await expect(preview.locator('html')).toHaveAttribute('dir','rtl'); await expect(preview.getByRole('heading',{ name:'المقبلات' })).toBeVisible();
  await page.getByRole('combobox',{ name:'Preview size',exact:true }).selectOption('390px');
  await page.getByRole('combobox',{ name:'Mobile Columns',exact:true }).selectOption('2'); await expect(preview.locator('.restaurant-menu')).toHaveAttribute('data-mobile-columns','2');
  const malicious = { type:'daify:design',version:1,language:'en',design:defaultDesign('noir') };
  await preview.locator('body').evaluate((_body,message) => window.postMessage(message,window.location.origin),malicious);
  await expect(preview.locator('.restaurant-menu')).toHaveAttribute('data-template','feast');
  await page.evaluate(message => document.querySelector('iframe')!.contentWindow!.postMessage({ ...message, version:2 },window.location.origin),malicious);
  await expect(preview.locator('.restaurant-menu')).toHaveAttribute('data-template','feast');
  await page.getByRole('button',{ name:'Save design',exact:true }).click(); await expect(page.getByRole('status')).toContainText('Design saved');
  const slug = `menu-${stamp}`; await page.getByLabel('Link name').fill(slug); await page.getByRole('button',{ name:'Publish menu',exact:true }).click(); await expect(page.getByRole('status')).toHaveText('Your menu is published.');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  if (process.env.QA_EVIDENCE_DIR) {
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/studio-published-desktop.png`, animations: 'disabled' });
    await page.setViewportSize({ width:390,height:844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${process.env.QA_EVIDENCE_DIR}/studio-published-mobile.png`,fullPage:true, animations: 'disabled' });
    await page.setViewportSize({ width:1280,height:900 });
  }
  const qrPath = `/api/menu-qr/${org.id}/${location.id}/${menu.id}?format=png`;
  const qr = await page.request.get(qrPath); expect(qr.ok()).toBeTruthy(); expect(qr.headers()['content-type']).toBe('image/png');
  const decodedImage = await sharp(await qr.body()).ensureAlpha().raw().toBuffer({ resolveWithObject:true });
  const decoded = jsQR(new Uint8ClampedArray(decodedImage.data),decodedImage.info.width,decodedImage.info.height);
  expect(decoded?.data).toBe(`${origin}/q/${slug}`);
  const publicContext = await browser.newContext({ javaScriptEnabled:false,extraHTTPHeaders:{ 'x-daify-test-client-ip':'192.0.2.91' } });
  const guest = await publicContext.newPage(); let response = await guest.goto(decoded!.data+'?lang=ar'); expect(response?.headers()['cache-control']).toBe('no-store');
  await expect(guest.getByRole('heading',{ name:'المقبلات' })).toBeVisible(); await expect(guest.locator('.restaurant-menu')).toHaveAttribute('data-template','feast');
  expect((await publicContext.request.get(`/menu-preview/${org.id}/${location.id}/${menu.id}`.replace(/^/,origin))).status()).toBe(404);
  expect((await publicContext.request.get(origin+qrPath)).status()).toBe(401);
  await page.getByRole('combobox',{ name:'Template',exact:true }).selectOption('atelier'); await page.getByRole('button',{ name:'Save design',exact:true }).click(); await expect(page.getByRole('status')).toContainText('Design saved');
  await page.getByLabel('Link name').fill(`${slug}-new`); await page.getByRole('button',{ name:'Publish menu',exact:true }).click(); await expect(page.getByRole('status')).toHaveText('Your menu is published.');
  await guest.goto(decoded!.data); await expect(guest).toHaveURL(`${origin}/r/${slug}-new`); await expect(guest.locator('.restaurant-menu')).toHaveAttribute('data-template','atelier');
  await page.getByRole('button',{ name:'Restore version 1',exact:true }).click(); await expect(page.getByRole('status')).toContainText('Previous content published');
  await guest.goto(decoded!.data); await expect(guest.locator('.restaurant-menu')).toHaveAttribute('data-template','feast');
  const publication = await (await page.request.get(`/api/menus/${org.id}/${location.id}/${menu.id}/publication`)).json() as PublicationState; expect(publication.versions.map(version=>version.number)).toEqual([3,2,1]);
  await page.getByRole('button',{ name:'Unpublish',exact:true }).click(); await expect(page.getByRole('status')).toContainText('Menu unpublished');
  response = await guest.goto(decoded!.data); expect(response?.status()).toBe(404); await expect(guest.getByRole('heading',{ name:'Menu unavailable' })).toBeVisible();
  await publicContext.close();
});

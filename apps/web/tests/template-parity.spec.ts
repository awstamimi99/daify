import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { catalog, defaultDesign, layoutOptions, templateKeys } from '@daify/menu-engine';
import type { RenderModel } from '@daify/menu-engine';
import demo from '../src/features/publishing/demo.json';
const rootDirectory = resolve(__dirname,'../../..');
function prototype(template: typeof templateKeys[number], language: string) {
  const root = { innerHTML:'' };
  const window: { MenuFlowRendererRegistry?: Record<string,{ render: (root: { innerHTML:string },data:RenderModel,options: object) => void }> } = {};
  const family = catalog[template].family;
  runInNewContext(readFileSync(resolve(rootDirectory,`assets/js/menu/${family === 'feast' ? 'feast-renderer' : 'menu-renderer'}.js`),'utf8'),{ window,document:{ documentElement:{},title:'' } });
  window.MenuFlowRendererRegistry![family]!.render(root,demo as RenderModel,{ template,lang:language });
  return root.innerHTML;
}
async function measurements(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-menu-section]')].map(section => {
    const first = section.querySelector('[data-menu-item]')!, image = first.querySelector('figure')!, title = first.querySelector('h3')!;
    const card = getComputedStyle(first), media = getComputedStyle(image), heading = getComputedStyle(title);
    return { headings:[...section.querySelectorAll('h2,h3')].map(node=>node.textContent),items:section.querySelectorAll('[data-menu-item]').length,display:card.display,radius:card.borderRadius,cardBackground:card.backgroundColor,mediaRadius:media.borderRadius,headingFont:heading.fontFamily,headingSize:heading.fontSize,columns:getComputedStyle(first.parentElement!).gridTemplateColumns };
  }));
}
for (const template of templateKeys) for (const [width,language] of [[1440,'en'],[390,'ar']] as const) test(`${template} ${language} preserves prototype structure, typography and every layout capability`, async ({ page }) => {
  await page.setViewportSize({ width,height:900 }); await page.goto(`/templates/${template}/preview?lang=${language}`); await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({ content:'.menu-section{animation:none!important}' });
  const defaults = defaultDesign(template);
  const cases = Object.entries(layoutOptions).flatMap(([key,values]) => values.map(value=>({key,value})));
  const actual: unknown[] = [];
  const attributes = await page.locator('.restaurant-menu').evaluate(root=>Object.fromEntries([...root.attributes].map(attribute=>[attribute.name,attribute.value])));
  for (const change of cases) { await page.locator('.restaurant-menu').evaluate((root,{ change,defaults })=>{ Object.assign((root as HTMLElement).dataset,defaults); (root as HTMLElement).dataset[change.key]=change.value; },{ change,defaults:defaults.layout }); actual.push(await measurements(page)); }

  await page.locator('#menu-root').evaluate((root,markup)=>{root.innerHTML=markup;},prototype(template,language));
  await page.locator('.restaurant-menu').evaluate((root,attributes)=>{for (const [name,value] of Object.entries(attributes))root.setAttribute(name,value);},attributes);
  for (const [index,change] of cases.entries()) { await page.locator('.restaurant-menu').evaluate((root,{ change,defaults })=>{ Object.assign((root as HTMLElement).dataset,defaults); (root as HTMLElement).dataset[change.key]=change.value; },{ change,defaults:defaults.layout }); expect(await measurements(page),`${template} ${change.key}=${change.value}`).toEqual(actual[index]); }
  expect(defaults.templateKey).toBe(template);
});

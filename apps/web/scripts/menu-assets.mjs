import { mkdir, copyFile, cp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const web = resolve(dirname(fileURLToPath(import.meta.url)), '..'), root = resolve(web, '../..'), target = resolve(web, 'public/menu-assets');
await mkdir(target, { recursive: true });
for (const file of ['base-menu','atelier','verde','noir','amalfi','sora','ember','souk','mellow','feast','polish']) await copyFile(resolve(root, `assets/css/templates/${file}.css`), resolve(target, `${file}.css`));
const fonts = [['cormorant-garamond',[500,600]],['dm-serif-display',[400]],['inter',[400,500,600,700]],['noto-kufi-arabic',[400,500,600]],['space-grotesk',[500,600,700]]];
let fontCss = '';
for (const [font, weights] of fonts) {
  const directory = dirname(require.resolve(`@fontsource/${font}/${weights[0]}.css`));
  await cp(resolve(directory,'files'), resolve(target, 'fonts', font), { recursive: true });
  for (const weight of weights) fontCss += (await readFile(resolve(directory,`${weight}.css`),'utf8')).replaceAll('./files/', `./fonts/${font}/`);
}
const base = await readFile(resolve(target,'base-menu.css'),'utf8');
await writeFile(resolve(target,'base-menu.css'),fontCss+'\n'+base.replace(/^@import[^\n]+\n/,''));
await copyFile(resolve(web,'src/features/publishing/production.css'),resolve(target,'production.css'));
await build({ entryPoints: [resolve(web,'src/features/publishing/browser.ts')], outfile: resolve(target,'runtime.js'), bundle: true, minify: true, platform: 'browser', target: 'es2022' });
await cp(resolve(root,'assets/images/menu'),resolve(target,'demo/menu'),{ recursive: true });
for (const file of ['oliva-seabass.png','restaurant-interior.png']) await copyFile(resolve(root,'assets/images',file),resolve(target,'demo',file));

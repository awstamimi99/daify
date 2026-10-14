import { renderClassic } from './classic';
import { renderFeast } from './feast';
import { normalize, escapeHtml as esc } from './render-model';
import type { RenderModel } from './render-model';
import { catalog, isRtl, languageFor } from './index';
import type { Design, MenuSnapshot } from './index';
const tokenProperties = { background: 'bg', surface: 'surface', primary: 'primary', accent: 'accent', text: 'text', muted: 'muted', cardRadius: 'radius-card', buttonRadius: 'radius-button' } as const;
export const renderers = { classic: renderClassic, feast: renderFeast } as const;
export function rendererFor(family: keyof typeof renderers) { return renderers[family]; }
export function renderMarkup(model: RenderModel, design: Design, language: string) {
  const style = Object.entries(tokenProperties).map(([key, css]) => `--restaurant-${css}:${design.tokens[key as keyof typeof tokenProperties]}`).join(';');
  const attrs = Object.entries(design.layout).map(([key, value]) => `data-${key.replace(/[A-Z]/g, c => '-'+c.toLowerCase())}="${esc(value)}"`).join(' ');
  const family = catalog[design.templateKey].family as keyof typeof renderers;
  let html = rendererFor(family)(model, { lang: language, template: design.templateKey, name: catalog[design.templateKey].name });
  html = html.replace('data-template=', `style="${esc(style)};--restaurant-grid-columns:${design.layout.gridColumns}" ${attrs} data-family="${family}" dir="${isRtl(language) ? 'rtl' : 'ltr'}" data-template=`);
  // Hide absent optional business details; never invent opening hours or contact data.
  if (!model.restaurant.openingStatus) html = html.replace(/<div class="(?:restaurant-status|feast-header-status)">[\s\S]*?<\/div>/, '');
  if (!model.restaurant.phone) html = html.replace(/<a href="tel:[^"]*">[\s\S]*?<\/a>/g, '');
  if (!model.restaurant.whatsapp) html = html.replace(/<a href="https:\/\/wa\.me\/[^"]*">[\s\S]*?<\/a>/g, '');
  return html;
}
export interface DocumentOptions { imageBase: string; language?: string; preview?: boolean; nonce: string; demoModel?: RenderModel; analytics?: { slug: string; versionId: string }; }
export function menuDocument(snapshot: MenuSnapshot, options: DocumentOptions): string {
  const language = languageFor(snapshot, options.language), design = snapshot.design;
  const model = options.demoModel ?? normalize(snapshot, language, id => `${options.imageBase}/${encodeURIComponent(id)}`);
  const data = JSON.stringify({ snapshot, imageBase: options.imageBase, preview: !!options.preview, ...(!options.preview && options.analytics ? { analytics: options.analytics } : {}) }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="${esc(language)}" dir="${isRtl(language) ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(model.restaurant.name)} — ${esc(model.restaurant.type)}</title><link rel="stylesheet" href="/menu-assets/base-menu.css"><link data-template-css rel="stylesheet" href="/menu-assets/${design.templateKey}.css"><link data-polish-css rel="stylesheet" href="/menu-assets/polish.css" ${design.templateKey === 'feast' ? 'disabled' : ''}><link rel="stylesheet" href="/menu-assets/production.css"></head><body><nav class="menu-language" aria-label="Language">${snapshot.supportedLanguages.map(lang => `<a href="?lang=${encodeURIComponent(lang)}" lang="${esc(lang)}" ${lang === language ? 'aria-current="true"' : ''}>${esc(lang)}</a>`).join('')}</nav><div id="menu-root">${renderMarkup(model, design, language)}</div><script id="menu-data" type="application/json" nonce="${options.nonce}">${data}</script><script src="/menu-assets/runtime.js" nonce="${options.nonce}" defer></script></body></html>`;
}

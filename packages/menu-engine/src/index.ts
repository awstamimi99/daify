import catalogData from './catalog.json';
export type TemplateKey = keyof typeof catalogData;
export const templateKeys = Object.keys(catalogData) as TemplateKey[];
export const colorKeys = ['background', 'surface', 'primary', 'accent', 'text', 'muted'] as const;
export const layoutOptions = {
  itemLayout: ['list', 'grid', 'image-focus'], sectionNav: ['tabs', 'chips', 'minimal'],
  cardStyle: ['flat', 'bordered', 'elevated'], imageStyle: ['square', 'rounded', 'circle', 'full-bleed'],
  gridColumns: ['2', '3', '4'], mobileColumns: ['1', '2'], tabletColumns: ['1', '2', '3'], desktopColumns: ['2', '3', '4'],
} as const;
export type Tokens = Record<typeof colorKeys[number] | 'cardRadius' | 'buttonRadius', string>;
export type Layout = { [K in keyof typeof layoutOptions]: typeof layoutOptions[K][number] };
export interface Block { type: 'featured' | 'menu' | 'story' | 'gallery'; visible: boolean; heading?: string; headingAr?: string; body?: string; bodyAr?: string; imageId?: string; imageIds?: string[]; imagePosition?: 'left' | 'right'; columns?: 2 | 3 | 4; }
export interface Design { schemaVersion: 1; templateKey: TemplateKey; tokens: Tokens; layout: Layout; heroImageId?: string; footerImageId?: string; blocks: Block[]; }
export const catalog = catalogData;
export function defaultDesign(templateKey: TemplateKey = 'atelier'): Design {
  const defaults = catalog[templateKey].defaults;
  return { schemaVersion: 1, templateKey, tokens: Object.fromEntries([...colorKeys, 'cardRadius', 'buttonRadius'].map(key => [key, defaults[key as keyof typeof defaults]])) as Tokens,
    layout: Object.fromEntries(Object.keys(layoutOptions).map(key => [key, defaults[key as keyof typeof defaults]])) as Layout,
    blocks: [{ type: 'featured', visible: true }, { type: 'menu', visible: true }] };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.');
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, keys: string[]) { if (Object.keys(value).some(key => !keys.includes(key))) throw new Error('Unknown design setting.'); }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateDesign(value: unknown): Design {
  const d = object(value); exact(d, ['schemaVersion','templateKey','tokens','layout','blocks','heroImageId','footerImageId']);
  if (d.schemaVersion !== 1 || !templateKeys.includes(d.templateKey as TemplateKey)) throw new Error('Unsupported design version or template.');
  const tokens = object(d.tokens), layout = object(d.layout);
  exact(tokens, [...colorKeys, 'cardRadius', 'buttonRadius']); exact(layout, Object.keys(layoutOptions));
  for (const key of colorKeys) if (typeof tokens[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(tokens[key])) throw new Error('Use six-digit hex colors.');
  for (const key of ['cardRadius','buttonRadius']) if (typeof tokens[key] !== 'string' || !/^(?:[0-9]|[1-4][0-9]|999)px$/.test(tokens[key])) throw new Error('Unsupported corner radius.');
  for (const [key, values] of Object.entries(layoutOptions)) if (!(values as readonly unknown[]).includes(layout[key])) throw new Error(`Unsupported ${key}.`);
  for (const key of ['heroImageId','footerImageId']) if (d[key] !== undefined && (typeof d[key] !== 'string' || !uuid.test(d[key]))) throw new Error('Choose an uploaded image.');
  if (!Array.isArray(d.blocks) || d.blocks.length < 1 || d.blocks.length > 12) throw new Error('Choose 1–12 content blocks.');
  let menus = 0;
  for (const value of d.blocks) {
    const block = object(value); exact(block, ['type','visible','heading','headingAr','body','bodyAr','imageId','imageIds','imagePosition','columns']);
    if (!['featured','menu','story','gallery'].includes(String(block.type)) || typeof block.visible !== 'boolean') throw new Error('Invalid content block.');
    if (block.type === 'menu') { menus++; if (!block.visible) throw new Error('The menu block must stay visible.'); }
    for (const key of ['heading','headingAr','body','bodyAr']) if (block[key] !== undefined && (typeof block[key] !== 'string' || block[key].length > (key.startsWith('body') ? 2000 : 160))) throw new Error('Content block text is too long.');
    if (block.imageId !== undefined && (typeof block.imageId !== 'string' || !uuid.test(block.imageId))) throw new Error('Invalid block image.');
    if (block.imageIds !== undefined && (!Array.isArray(block.imageIds) || block.imageIds.length > 12 || block.imageIds.some(id => typeof id !== 'string' || !uuid.test(id)))) throw new Error('Invalid gallery images.');
    if (block.imagePosition !== undefined && !['left','right'].includes(String(block.imagePosition))) throw new Error('Invalid image position.');
    if (block.columns !== undefined && ![2,3,4].includes(block.columns as number)) throw new Error('Invalid gallery columns.');
  }
  if (menus !== 1) throw new Error('Include exactly one menu block.');
  return JSON.parse(JSON.stringify(d)) as Design;
}
export interface Translation { languageTag: string; name: string; description: string; }
export interface SnapshotImage { id: string; translations: { languageTag: string; altText: string }[]; }
export interface SnapshotItem { id: string; price: string; currency: string; isAvailable: boolean; isFeatured: boolean; allergens: string[]; dietaryTags: string[]; translations: Translation[]; images: SnapshotImage[]; }
export interface SnapshotSection { id: string; translations: Translation[]; items: SnapshotItem[]; }
export interface MenuSnapshot { schemaVersion: 1; defaultLanguage: string; supportedLanguages: string[]; restaurant: { name: string; location: string; phone: string; address: string }; translations: Translation[]; sections: SnapshotSection[]; design: Design; }
export interface VersionSummary { id: string; number: number; publishedAt: string; publishedById: string; sourceDraftRevision: number; rollbackSourceId: string | null; }
export interface PublicationState { revision: number; publicSlug: string | null; visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'; currentVersionId: string | null; versions: VersionSummary[]; design: Design; publishingEnabled: boolean; }
export interface PublicMenu { slug: string; requestedSlug: string; visibility: 'PUBLIC' | 'UNLISTED'; versionId: string; version: number; snapshot: MenuSnapshot; analyticsEnabled: boolean; }
export interface PreviewMessage { type: 'daify:design'; version: 1; design: Design; language: string; }
export function parsePreviewMessage(value: unknown): PreviewMessage | null {
  try { const message = object(value); exact(message, ['type','version','design','language']); if (message.type !== 'daify:design' || message.version !== 1 || typeof message.language !== 'string' || message.language.length > 35) return null; Intl.getCanonicalLocales(message.language); return { type: 'daify:design', version: 1, design: validateDesign(message.design), language: message.language }; } catch { return null; }
}
export function designImageIds(design: Design) { return [...new Set([design.heroImageId, design.footerImageId, ...design.blocks.flatMap(block => [block.imageId, ...(block.imageIds ?? [])])].filter((id): id is string => !!id))]; }
export function languageFor(snapshot: MenuSnapshot, requested?: string): string { try { const canonical = Intl.getCanonicalLocales(requested ?? snapshot.defaultLanguage)[0]; return canonical && snapshot.supportedLanguages.includes(canonical) ? canonical : snapshot.defaultLanguage; } catch { return snapshot.defaultLanguage; } }
export function isRtl(language: string) { return ['ar','he','fa','ur','ps','dv'].includes(language.split('-')[0] ?? ''); }
export { menuDocument, renderMarkup, renderers, rendererFor } from './document';
export { normalize, escapeHtml } from './render-model';
export type { RenderModel } from './render-model';

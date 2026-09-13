import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { catalog, defaultDesign, designImageIds, languageFor, menuDocument, normalize, parsePreviewMessage, templateKeys, validateDesign } from '@daify/menu-engine';
import type { MenuSnapshot } from '@daify/menu-engine';
const snapshot: MenuSnapshot = { schemaVersion: 1, defaultLanguage: 'fr-CA', supportedLanguages: ['fr-CA','ar'], restaurant: { name: '<script>alert(1)</script>', location: '', address: '', phone: '' }, translations: [{ languageTag: 'fr-CA', name: 'Dîner', description: '' },{ languageTag: 'ar', name: 'عشاء', description: '' }], sections: [{ id: 'section', translations: [{ languageTag: 'fr-CA', name: 'Entrées', description: '' }], items: [{ id: 'item', price: '2.750', currency: 'KWD', isAvailable: false, isFeatured: true, allergens: ['milk'], dietaryTags: [], translations: [{ languageTag: 'fr-CA', name: 'Soupe', description: '</script><img src=x onerror=alert(1)>' }], images: [] }] }], design: defaultDesign() };
describe('shared production menu engine', () => {
  it('preserves every original template id, family, default, preset and capability', () => {
    const context = { window: { MenuFlowTemplateConfigs: undefined as unknown } };
    runInNewContext(readFileSync(resolve(__dirname, '../../../../assets/js/menu/templates-config.js'), 'utf8'), context);
    expect(catalog).toEqual(context.window.MenuFlowTemplateConfigs);
  });
  it.each(templateKeys)('validates every preserved %s capability and rejects unsupported settings', key => {
    const design = defaultDesign(key); expect(validateDesign(design)).toEqual(design);
    expect(() => validateDesign({ ...design, layout: { ...design.layout, itemLayout: 'anything' } })).toThrow();
    expect(() => validateDesign({ ...design, tokens: { ...design.tokens, text: '#fff; background:url(x)' } })).toThrow();
    expect(() => validateDesign({ ...design, blocks: [] })).toThrow();
  });
  it('uses canonical configured language fallback and structured currency independently of translated names', () => {
    expect(languageFor(snapshot,'fr-ca')).toBe('fr-CA'); expect(languageFor(snapshot,'en')).toBe('fr-CA'); expect(languageFor(snapshot,'bad_tag')).toBe('fr-CA');
    const model = normalize(snapshot,'ar',id => `/images/${id}`); expect(model.sections[0]!.name).toBe('Entrées'); expect(model.sections[0]!.items[0]!.name).toBe('Soupe'); expect(model.sections[0]!.items[0]!.price).not.toBe('2.750');
  });
  it('escapes untrusted content in HTML, attributes and embedded JSON for both families', () => {
    for (const template of ['atelier','feast'] as const) {
      const html = menuDocument({ ...snapshot, design: defaultDesign(template) }, { imageBase: '/images', nonce: 'test', language: 'ar' });
      expect(html).not.toContain('<script>alert(1)</script>'); expect(html).not.toContain('<img src=x onerror=alert(1)>'); expect(html).toContain('&lt;script&gt;'); expect(html).toContain('dir="rtl"'); expect(html).not.toContain('src=""');
    }
  });
  it('requires the exact versioned message and references only upload identifiers', () => {
    expect(parsePreviewMessage({ type: 'daify:design', version: 1, language: 'ar', design: defaultDesign() })).not.toBeNull();
    for (const value of [null,{ type: 'menuflow-theme' },{ type: 'daify:design', version: 2, language: 'ar', design: defaultDesign() },{ type: 'daify:design', version: 1, language: 'ar', design: defaultDesign(), html: '<script>' }]) expect(parsePreviewMessage(value)).toBeNull();
    expect(() => validateDesign({ ...defaultDesign(), heroImageId: 'https://evil.example' })).toThrow(); expect(designImageIds(defaultDesign())).toEqual([]);
  });
});

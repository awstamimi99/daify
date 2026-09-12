import { BadRequestException } from '@nestjs/common';
import type { TranslationDto } from './dto/menu.dto';

export function canonicalLanguage(value: string): string {
  try {
    const result = Intl.getCanonicalLocales(value)[0];
    if (!result || result.length > 35) throw new Error();
    return result;
  } catch { throw new BadRequestException('Use a valid BCP 47 language tag.'); }
}
export function languages(defaultLanguage: string, supported: string[]) {
  const primary = canonicalLanguage(defaultLanguage);
  const enabled = supported.map(canonicalLanguage);
  if (new Set(enabled).size !== enabled.length || !enabled.includes(primary)) throw new BadRequestException('Languages must be unique and include the default language.');
  return { defaultLanguage: primary, supportedLanguages: enabled };
}
export function translations(values: TranslationDto[], primary: string, enabled: string[]) {
  const result = values.map(value => ({ languageTag: canonicalLanguage(value.languageTag), name: value.name.trim(), description: value.description?.trim() ?? '' }));
  if (new Set(result.map(value => value.languageTag)).size !== result.length || result.some(value => !enabled.includes(value.languageTag))) throw new BadRequestException('Translations must use unique enabled languages.');
  if (!result.find(value => value.languageTag === primary)?.name) throw new BadRequestException('A name in the default language is required.');
  return result;
}
interface Localized { id: string; translations: { languageTag: string; name: string; description: string }[]; }
interface Image { id: string; translations: { languageTag: string; altText: string }[]; }
export function completeness(menu: Localized & { supportedLanguages: string[]; sections: (Localized & { items: (Localized & { images: Image[] })[] })[] }) {
  return { version: 1, languages: menu.supportedLanguages.map(languageTag => {
    const missingRequired: { entity: string; id: string; field: string }[] = [];
    const missingOptional: { entity: string; id: string; field: string }[] = [];
    const check = (entity: string, value: Localized) => {
      const translation = value.translations.find(row => row.languageTag === languageTag);
      if (!translation?.name.trim()) missingRequired.push({ entity, id: value.id, field: 'name' });
      if (!translation?.description.trim()) missingOptional.push({ entity, id: value.id, field: 'description' });
    };
    check('menu', menu);
    for (const section of menu.sections) {
      check('section', section);
      for (const item of section.items) {
        check('item', item);
        for (const image of item.images) if (!image.translations.find(row => row.languageTag === languageTag)?.altText.trim()) missingOptional.push({ entity: 'image', id: image.id, field: 'altText' });
      }
    }
    return { languageTag, complete: missingRequired.length === 0, missingRequired, missingOptional };
  }) };
}

import type { MenuSnapshot, Translation, Block } from './index';
import { languageFor } from './index';
export interface RenderItem { id: string; name: string; description: string; price: string; image: string | null; imageAlt?: string; allergens?: string; badge: string; dietary: string[]; available: boolean; featured: boolean; translations: Record<string, Partial<Translation>>; }
export interface RenderSection { id: string; name: string; nameAr: string; description: string; descriptionAr: string; order: number; items: RenderItem[]; }
export interface RenderBlock extends Omit<Block, 'type' | 'visible'> { type: Block['type']; visible: boolean; image?: string; images?: string[]; kicker?: string; kickerAr?: string; subheading?: string; subheadingAr?: string; }
export interface RenderRestaurant { establishedYear?: number; name: string; logoText: string; type: string; description: string; coverImage: string; footerImage: string; address: string; phone: string; whatsapp: string; instagram: string; openingStatus: string; allergenNotice: string; hours: { days: string; daysAr: string; time: string; timeAr: string }[]; translations: Record<string, Partial<Omit<RenderRestaurant, 'translations'>>>; }
export interface RenderModel { restaurant: RenderRestaurant; sections: RenderSection[]; layout?: { blocks?: RenderBlock[]; hero?: { image: string }; footer?: { image: string } }; }
export interface RenderOptions { lang?: string; template?: string; name?: string; previewCoverImage?: string; }
export const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] ?? char));
export function normalize(snapshot: MenuSnapshot, requested: string | undefined, imageUrl: (id: string) => string): RenderModel {
  const language = languageFor(snapshot, requested);
  const local = (rows: Translation[]) => rows.find(row => row.languageTag === language) ?? rows.find(row => row.languageTag === snapshot.defaultLanguage) ?? { name: '', description: '' };
  const copy = local(snapshot.translations);
  const image = (id?: string) => id ? imageUrl(id) : '';
  const firstImage = snapshot.sections.flatMap(section => section.items).find(item => item.images.length)?.images[0]?.id;
  return { restaurant: { name: snapshot.restaurant.name, logoText: snapshot.restaurant.name.slice(0,1), type: copy.name, description: copy.description, coverImage: image(snapshot.design.heroImageId ?? firstImage), footerImage: image(snapshot.design.footerImageId ?? firstImage), address: snapshot.restaurant.address || snapshot.restaurant.location, phone: snapshot.restaurant.phone, whatsapp: '', instagram: '', openingStatus: '', allergenNotice: '', hours: [], translations: {} },
    sections: snapshot.sections.map((section, index) => { const copy = local(section.translations); return { id: section.id, name: copy.name, nameAr: copy.name, description: copy.description, descriptionAr: copy.description, order: index + 1, items: section.items.map(item => {
      const copy = local(item.translations);
      const allergens = item.allergens.length ? `${language.startsWith('ar') ? 'مسببات الحساسية' : 'Allergens'}: ${item.allergens.join(', ')}` : '';
      return { id: item.id, name: copy.name, description: copy.description, allergens, price: new Intl.NumberFormat(language, { style: 'currency', currency: item.currency }).format(Number(item.price)), image: item.images[0] ? imageUrl(item.images[0].id) : null, imageAlt: item.images[0]?.translations.find(row => row.languageTag === language)?.altText || item.images[0]?.translations.find(row => row.languageTag === snapshot.defaultLanguage)?.altText || copy.name, badge: '', dietary: item.dietaryTags, available: item.isAvailable, featured: item.isFeatured, translations: {} };
    }) }; }), layout: { hero: { image: image(snapshot.design.heroImageId ?? firstImage) }, footer: { image: image(snapshot.design.footerImageId ?? firstImage) }, blocks: snapshot.design.blocks.map(block => ({ ...block, image: image(block.imageId), images: block.imageIds?.map(imageUrl) })) } };
}

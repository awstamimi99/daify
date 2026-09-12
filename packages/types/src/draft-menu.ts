export interface DraftTranslation { languageTag: string; name: string; description: string; }
export interface DraftImage { id: string; mimeType: string; bytes: number; width: number; height: number; position: number; translations: { languageTag: string; altText: string }[]; }
export interface DraftItem {
  id: string; sectionId: string; stableKey: string; position: number; price: string; currency: string;
  isAvailable: boolean; isFeatured: boolean; allergens: string[]; dietaryTags: string[];
  translations: DraftTranslation[]; images: DraftImage[];
}
export interface DraftSection { id: string; stableKey: string; position: number; isVisible: boolean; translations: DraftTranslation[]; items: DraftItem[]; }
export interface DraftMenuSummary { id: string; name: string; slug: string; defaultLanguage: string; supportedLanguages: string[]; draftRevision: number; updatedAt: string; status: string; }
export interface DraftMenu extends DraftMenuSummary {
  locationId: string; currency: string; translations: DraftTranslation[]; sections: DraftSection[];
  completeness: { version: number; languages: { languageTag: string; complete: boolean; missingRequired: { entity: string; id: string; field: string }[]; missingOptional: { entity: string; id: string; field: string }[] }[] };
}

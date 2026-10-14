export interface AnalyticsReport {
  mode: 'local' | 'disabled'; from: string; to: string; timezone: 'UTC'; updatedAt: string | null;
  totals: Record<'MENU_VIEW' | 'QR_REDIRECT' | 'LANGUAGE_CHANGE' | 'SECTION_VIEW' | 'ITEM_VIEW', number>;
  days: { day: string; views: number; qr: number }[];
  languages: { language: string; views: number }[];
  locations: { id: string; name: string }[];
}

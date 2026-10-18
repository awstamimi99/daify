import { arabicMessages } from './catalog';
export type Locale = 'en' | 'ar';
export const localeCookie = 'daify_locale';
export function normalizeLocale(value: unknown): Locale { return value === 'ar' ? 'ar' : 'en'; }
export function translator(locale: Locale) {
  return (message: string, alternativeOrValues?: string | Record<string, string | number>) => {
    const alternative = typeof alternativeOrValues === 'string' ? alternativeOrValues : undefined;
    const translated = locale === 'ar' ? alternative ?? (arabicMessages[message.trim()] ? message.replace(message.trim(), arabicMessages[message.trim()]!) : message) : message;
    return typeof alternativeOrValues === 'object'
      ? translated.replace(/\{(\w+)\}/g, (match, key: string) => String(alternativeOrValues[key] ?? match)) : translated;
  };
}

export function translateError(locale: Locale, message: string): string {
  if (locale === "en" || /[\u0600-\u06ff]/.test(message)) return message;
  return arabicMessages[message.trim()] ?? "تعذّر إكمال الطلب. راجع المدخلات والصلاحيات ثم حاول مجددًا. إذا استمرت المشكلة، تواصل مع الدعم.";
}

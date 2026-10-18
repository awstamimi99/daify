'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { localeCookie, translator, translateError, type Locale } from '@/lib/i18n/translate';

const Context = createContext<{ locale: Locale; setLocale: (locale: Locale) => void } | null>(null);
export function LanguageProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const router = useRouter();
  function setLocale(next: Locale) {
    if (next !== 'ar' && next !== 'en') return;
    document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    updateLocale(next);
    // Refresh server-rendered labels without remounting forms or changing URLs.
    router.refresh();
  }
  return <Context.Provider value={{ locale, setLocale }}>{children}</Context.Provider>;
}
export function useI18n() {
  const context = useContext(Context);
  if (!context) throw new Error('LanguageProvider is required.');
  const t = useMemo(() => translator(context.locale), [context.locale]);
  return { ...context, t, errorMessage: (message: string) => translateError(context.locale, message), arabic: context.locale === 'ar', setArabic: (value: boolean) => context.setLocale(value ? 'ar' : 'en') };
}
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return <div className="language-switcher" role="group" aria-label={locale === 'ar' ? 'لغة الواجهة' : 'Interface language'} dir="ltr">
    <button type="button" lang="en" aria-label="English" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
    <button type="button" lang="ar" aria-label="العربية" aria-pressed={locale === 'ar'} onClick={() => setLocale('ar')}>AR</button>
  </div>;
}

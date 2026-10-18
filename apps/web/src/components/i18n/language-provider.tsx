'use client';
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
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
  const details = useRef<HTMLDetailsElement>(null);
  function choose(next: Locale) {
    details.current?.removeAttribute('open');
    setLocale(next);
  }
  const other = locale === 'en' ? 'ar' : 'en';
  return <div className="language-switcher" dir="ltr">
    <button className="language-current" type="button" aria-label={other === 'ar' ? 'العربية' : 'English'} onClick={() => choose(other)}>{locale.toUpperCase()}</button>
    <details ref={details}>
      <summary role="button" aria-label={locale === 'ar' ? 'اختر لغة الواجهة' : 'Choose interface language'} aria-haspopup="menu">
        <svg aria-hidden="true" viewBox="0 0 12 8"><path d="m1 1 5 5 5-5" /></svg>
      </summary>
      <div className="language-menu" role="menu" aria-label={locale === 'ar' ? 'اختر لغة الواجهة' : 'Choose interface language'}>
        <button type="button" role="menuitemradio" aria-checked={locale === 'en'} lang="en" onClick={() => choose('en')}><span>EN</span><strong>English</strong></button>
        <button type="button" role="menuitemradio" aria-checked={locale === 'ar'} lang="ar" onClick={() => choose('ar')}><span>AR</span><strong>العربية</strong></button>
      </div>
    </details>
  </div>;
}

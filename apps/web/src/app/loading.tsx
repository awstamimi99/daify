import { getTranslator } from '@/lib/i18n/server';
export default async function Loading() {
  const t = await getTranslator();
  return <main className="empty-state" aria-live="polite"><div><span className="eyebrow">{t("DAIFY")}</span><h1>{t("Preparing your experience.")}</h1><p>{t("Loading the next view…")}</p></div></main>;
}

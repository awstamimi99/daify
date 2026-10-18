"use client";
import { useI18n } from '@/components/i18n/language-provider';
import { ButtonLink } from "@daify/ui";

export default function NotFound() {
  const { t } = useI18n();
  return <main className="empty-state"><div><span className="eyebrow">404</span><h1>{t("This table is empty.")}</h1><p>{t("The page you were looking for may have moved, but DAIFY is right here.")}</p><ButtonLink href="/">{t("Return home")}</ButtonLink></div></main>;
}

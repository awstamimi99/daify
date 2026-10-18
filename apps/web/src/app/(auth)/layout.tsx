import { getTranslator } from '@/lib/i18n/server';
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { DaifyLogo } from "@/components/brand/daify-logo";
import { restaurantInterior } from "@/lib/assets";
import { LanguageSwitcher } from "@/components/i18n/language-provider";
import styles from "./auth.module.css";

export default async function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  const t = await getTranslator();
  return <main id="main-content" className={styles.shell}>
    <section className={styles.visual}><Image src={restaurantInterior} alt={t("Elegant restaurant interior")} fill priority sizes="(max-width: 800px) 100vw, 50vw" /><div className={styles.overlay}><Link href="/" aria-label={t("DAIFY home")}><DaifyLogo dark /></Link><blockquote>{t("“The menu should feel like the first chapter of dinner.”")}</blockquote><p>{t("Secure accounts, verified email, and server-enforced access—built for every location you operate.")}</p></div></section>
    <section className={styles.content}><div className="auth-language"><LanguageSwitcher /></div>{children}</section>
  </main>;
}

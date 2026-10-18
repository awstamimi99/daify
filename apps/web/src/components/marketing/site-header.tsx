"use client";
import { useI18n } from '@/components/i18n/language-provider';

import { ButtonLink } from "@daify/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DaifyLogo } from "@/components/brand/daify-logo";
import styles from "./site-header.module.css";

import { LanguageSwitcher } from "@/components/i18n/language-provider";

const links = [
  ["/features", "Features"], ["/templates", "Templates"], ["/#how", "How it works"],
  ["/pricing", "Pricing"], ["/about", "About"],
] as const;

export function SiteHeader() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label={t("Main navigation")}>
        <Link href="/" aria-label={t("DAIFY home")}><DaifyLogo /></Link>
        <div className={`${styles.links} ${open ? styles.open : ""}`} id="marketing-navigation">
          {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{t(label)}</Link>)}
          <div className={styles.mobileActions}><Link href="/login">{t("Log in")}</Link><ButtonLink href="/signup">{t("Start free trial ")}<span aria-hidden="true">↗</span></ButtonLink></div>
        </div>
        <div className={styles.actions}><LanguageSwitcher /><Link className={styles.login} href="/login">{t("Log in")}</Link><ButtonLink className={styles.trial} href="/signup">{t("Start free trial ")}<span aria-hidden="true">↗</span></ButtonLink>
          <button className={styles.toggle} type="button" aria-expanded={open} aria-controls="marketing-navigation" onClick={() => setOpen(value => !value)}><span className="sr-only">{t("Toggle navigation")}</span><span aria-hidden="true">{open ? "×" : "☰"}</span></button>
        </div>
      </nav>
    </header>
  );
}

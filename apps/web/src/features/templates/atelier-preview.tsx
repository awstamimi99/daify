"use client";

import type { Locale } from "@daify/types";
import Link from "next/link";
import { useState } from "react";
import { atelierDefinition, getAtelierMenu } from "./sample-menu";
import { rendererFor } from "./renderer-registry";
import styles from "./atelier-preview.module.css";

const AtelierRenderer = rendererFor(atelierDefinition.family);

export function AtelierPreview() {
  const [locale, setLocale] = useState<Locale>("en");
  return <main id="main-content" className={styles.workspace}>
    <header className={styles.toolbar}><div><Link href="/templates">← Templates</Link><span><b>Atelier</b> · Classic migration proof</span></div><div role="group" aria-label="Preview language"><button type="button" className={locale === "en" ? styles.active : ""} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>English</button><button type="button" className={locale === "ar" ? styles.active : ""} aria-pressed={locale === "ar"} onClick={() => setLocale("ar")}>العربية</button></div></header>
    <div className={styles.frame}><AtelierRenderer template={atelierDefinition} menu={getAtelierMenu(locale)} /></div>
  </main>;
}

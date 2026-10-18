"use client";
import { useI18n } from '@/components/i18n/language-provider';

import { ButtonLink } from "@daify/ui";
import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import { amalfiCover, atelierCover, emberCover, feastCover, mellowCover, noirCover, soraCover, soukCover, verdeCover } from "@/lib/assets";
import styles from "./templates-catalog.module.css";

interface CatalogTemplate { readonly slug: string; readonly name: string; readonly mood: string; readonly tone: string; readonly image: StaticImageData }

const templates: readonly CatalogTemplate[] = [
  { slug: "feast", name: "Feast", mood: "Modern", tone: "Image-forward browsing built for fast mobile ordering.", image: feastCover },
  { slug: "atelier", name: "Atelier", mood: "Fine Dining", tone: "Editorial restraint for refined dining.", image: atelierCover },
  { slug: "verde", name: "Verde", mood: "Cafe", tone: "Fresh, rounded, and naturally bright.", image: verdeCover },
  { slug: "noir", name: "Noir", mood: "Dark Luxury", tone: "Cinematic contrast and evening drama.", image: noirCover },
  { slug: "amalfi", name: "Amalfi", mood: "Mediterranean", tone: "Sunlit, social, and generous.", image: amalfiCover },
  { slug: "sora", name: "Sora", mood: "Minimal", tone: "Precise rhythm and spacious clarity.", image: soraCover },
  { slug: "ember", name: "Ember", mood: "Fast Casual", tone: "Bold, visual, and appetite-led.", image: emberCover },
  { slug: "souk", name: "Souk", mood: "Middle Eastern", tone: "Warm modern hospitality, RTL ready.", image: soukCover },
  { slug: "mellow", name: "Mellow", mood: "Bakery", tone: "Soft, tactile, and image-forward.", image: mellowCover },
] as const;

const moods = ["All", ...new Set(templates.map(template => template.mood))];

export function TemplatesCatalog() {
  const { t } = useI18n();
  const [mood, setMood] = useState("All");
  const visible = mood === "All" ? templates : templates.filter(template => template.mood === mood);

  return <section className={styles.catalog} aria-labelledby="template-collection-title">
    <div className="container">
      <div className={styles.filters} aria-label={t("Template filters")}>{moods.map(item => <button key={t(item)} type="button" aria-pressed={mood === item} onClick={() => setMood(item)}>{t(item)}</button>)}</div>
      <div className={styles.meta}><h2 id="template-collection-title"><b>{String(visible.length).padStart(2, "0")}</b> {t("designs in the collection")}</h2><p>{t("All nine templates support mobile screens, Arabic and English. Preview a design before choosing it.")}</p></div>
      <div className={styles.grid}>{visible.map((template, index) => <article className={styles.card} key={template.slug}>
        <div className={styles.cover}><Image src={template.image} alt={t("{0} menu template cover", { "0": template.name })} fill sizes="(max-width: 720px) 100vw, 33vw" /></div>
        <div className={styles.copy}><div><small>{String(index + 1).padStart(2, "0")} / 09 · {t(template.mood)}</small><h3>{template.name}</h3></div><p>{t(template.tone)}</p><ButtonLink variant="secondary" href={`/templates/${template.slug}/preview`}>{t("Preview ")}{template.name} <span aria-hidden="true">↗</span></ButtonLink></div>
      </article>)}</div>
    </div>
  </section>;
}

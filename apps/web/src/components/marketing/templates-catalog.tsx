"use client";

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
  const [mood, setMood] = useState("All");
  const visible = mood === "All" ? templates : templates.filter(template => template.mood === mood);

  return <section className={styles.catalog} aria-labelledby="template-collection-title">
    <div className="container">
      <div className={styles.filters} aria-label="Template filters">{moods.map(item => <button key={item} type="button" aria-pressed={mood === item} onClick={() => setMood(item)}>{item}</button>)}</div>
      <div className={styles.meta}><h2 id="template-collection-title"><b>{String(visible.length).padStart(2, "0")}</b> designs in the collection</h2><p>Every direction remains mobile-first and bilingual. M1 proves the React renderer contract with Atelier; the other eight production renderers remain M5 work.</p></div>
      <div className={styles.grid}>{visible.map((template, index) => <article className={styles.card} key={template.slug}>
        <div className={styles.cover}><Image src={template.image} alt={`${template.name} menu template cover`} fill sizes="(max-width: 720px) 100vw, 33vw" /></div>
        <div className={styles.copy}><div><small>{String(index + 1).padStart(2, "0")} / 09 · {template.mood}</small><h3>{template.name}</h3></div><p>{template.tone}</p>{template.slug === "atelier" ? <ButtonLink variant="secondary" href="/templates/atelier-preview">Open React proof <span aria-hidden="true">↗</span></ButtonLink> : <span className={styles.retained}>Legacy renderer retained for M5</span>}</div>
      </article>)}</div>
    </div>
  </section>;
}

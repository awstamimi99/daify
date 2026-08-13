import type { CSSProperties } from "react";
import type { Locale, MenuItem, MenuSection, TemplateRendererProps } from "@daify/types";
import Image from "next/image";
import styles from "./classic-renderer.module.css";

type ThemeStyle = CSSProperties & Record<`--restaurant-${string}`, string>;

function localized<T extends MenuItem | MenuSection>(record: T, locale: Locale) {
  const translation = record.translations[locale];
  return { name: translation?.name ?? record.name, description: translation?.description ?? record.description };
}

export function ClassicRenderer({ template, menu }: TemplateRendererProps) {
  const theme: ThemeStyle = {
    "--restaurant-bg": menu.theme.background, "--restaurant-surface": menu.theme.surface,
    "--restaurant-primary": menu.theme.primary, "--restaurant-accent": menu.theme.accent,
    "--restaurant-text": menu.theme.text, "--restaurant-muted": menu.theme.muted,
    "--restaurant-radius-card": menu.theme.cardRadius, "--restaurant-radius-button": menu.theme.buttonRadius,
  };
  return <article className={styles.menu} style={theme} lang={menu.locale} dir={menu.direction} data-template={template.slug} data-family={template.family}>
    <header className={styles.hero}><div className={styles.monogram}>O</div><span className={styles.kicker}>{menu.restaurant.location}</span><h1>{menu.restaurant.name}</h1><p>{menu.restaurant.description}</p><span className={styles.open}>Open for dinner</span></header>
    <nav className={styles.categories} aria-label={menu.locale === "ar" ? "أقسام القائمة" : "Menu sections"}>{menu.sections.map(section => <a key={section.id} href={`#${section.id}`} data-section-link>{localized(section, menu.locale).name}</a>)}</nav>
    <div className={styles.content}>{menu.sections.map(section => { const sectionCopy = localized(section, menu.locale); return <section className={styles.section} id={section.id} key={section.id} data-menu-section><header><span>0{section.order}</span><div><h2>{sectionCopy.name}</h2><p>{sectionCopy.description}</p></div></header><div className={styles.items}>{section.items.map(item => { const itemCopy = localized(item, menu.locale); return <article className={`${styles.item} ${!item.available ? styles.unavailable : ""}`} key={item.id} data-menu-item data-search={`${itemCopy.name} ${itemCopy.description}`}>
      <figure className={styles.media}>{item.image ? <Image src={item.image} alt="" width={220} height={220} sizes="(max-width: 520px) 88px, 110px" /> : <span aria-hidden="true">{itemCopy.name.slice(0, 1)}</span>}{!item.available ? <b className={styles.soldFlag}>{menu.locale === "ar" ? "غير متوفر" : "Sold out"}</b> : null}</figure>
      <div className={styles.itemContent}><div className={styles.itemLine}><h3>{itemCopy.name}</h3><bdi>{item.price}</bdi></div><p>{itemCopy.description}</p><div className={styles.tags}>{item.dietary.map(tag => <span key={tag}>{tag}</span>)}{item.badge ? <span>{item.badge}</span> : null}</div></div>
    </article>; })}</div></section>; })}</div>
    <footer className={styles.footer}><div><span className={styles.monogram}>O</span><strong>{menu.restaurant.name}</strong></div><p>{menu.restaurant.location}</p><small>Menu experience by DAIFY</small></footer>
  </article>;
}

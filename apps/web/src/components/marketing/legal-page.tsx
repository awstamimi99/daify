import Link from "next/link";
import type { LegalDocument } from "@/data/legal";
import styles from "./legal-page.module.css";

export function LegalPage({ document }: { readonly document: LegalDocument }) {
  return <main id="main-content">
    <section className={styles.hero}><div className="container"><span className="eyebrow">Legal · Draft for review</span><h1>{document.title}</h1><p>{document.intro}</p><div className={styles.meta}><span>Last updated: <strong>August 13, 2026</strong></span><span>Effective status: <strong>Pre-launch draft</strong></span></div><nav aria-label="Legal documents">{legalDocumentsNav.map(item => <Link key={item.slug} href={`/${item.slug}`} aria-current={document.slug === item.slug ? "page" : undefined}>{item.label}</Link>)}</nav></div></section>
    <section className={styles.body}><div className={`container ${styles.grid}`}>
      <aside className={styles.toc}><strong>On this page</strong><ol>{document.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol><p>Questions?<br /><a href={`mailto:${document.contact}`}>{document.contact} ↗</a></p></aside>
      <article className={styles.content}><div className={styles.summary}><b>The short version</b><p>{document.summary}</p></div>{document.sections.map((section, index) => <section id={section.id} key={section.id}><h2><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.bullets ? <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul> : null}</section>)}<p className={styles.disclaimer}>This preserved draft structure is not legal advice and must be reviewed before DAIFY launches a production service.</p></article>
    </div></section>
  </main>;
}

const legalDocumentsNav = [{ slug: "privacy", label: "Privacy" }, { slug: "terms", label: "Terms" }, { slug: "cookies", label: "Cookies" }] as const;

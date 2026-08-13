"use client";

import Link from "next/link";
import { useState } from "react";
import { DaifyLogo } from "@/components/brand/daify-logo";
import { NewsletterForm } from "./newsletter-form";
import styles from "./site-footer.module.css";

const columns = [
  { id: "product", label: "Product", links: [["/features", "Features"], ["/templates", "Templates"], ["/pricing", "Pricing"]] },
  { id: "company", label: "Company", links: [["/about", "About"], ["/contact", "Contact"], ["/login", "Log in"]] },
  { id: "legal", label: "Legal", links: [["/privacy", "Privacy"], ["/terms", "Terms"], ["/cookies", "Cookies"]] },
] as const;

export function SiteFooter() {
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  return <footer className={styles.footer}>
    <div className={styles.grid}>
      <div className={styles.brand}><DaifyLogo dark /><p>Better guest experiences, from the first scan.</p></div>
      {columns.map(column => <div className={`${styles.column} ${openColumn === column.id ? styles.open : ""}`} key={column.id}><button type="button" aria-expanded={openColumn === column.id} aria-controls={`footer-${column.id}`} onClick={() => setOpenColumn(current => current === column.id ? null : column.id)}><strong>{column.label}</strong><span aria-hidden="true">⌄</span></button><div id={`footer-${column.id}`}>{column.links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</div></div>)}
      <div className={styles.newsletter}><strong>A quieter kind of update.</strong><p>Product notes and hospitality ideas. No noise.</p><NewsletterForm /></div>
    </div>
    <div className={styles.base}><span>© 2026 DAIFY</span><span>Made for hospitality.</span><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}><span aria-hidden="true">↑</span> Back to top</button></div>
  </footer>;
}

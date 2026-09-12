"use client";

import { ButtonLink } from "@daify/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DaifyLogo } from "@/components/brand/daify-logo";
import styles from "./site-header.module.css";

const links = [
  ["/features", "Features"], ["/templates", "Templates"], ["/#how", "How it works"],
  ["/pricing", "Pricing"], ["/about", "About"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" aria-label="DAIFY home"><DaifyLogo /></Link>
        <button className={styles.toggle} type="button" aria-expanded={open} aria-controls="marketing-navigation" onClick={() => setOpen(value => !value)}>
          <span className="sr-only">Toggle navigation</span>{open ? "Close" : "Menu"}
        </button>
        <div className={`${styles.links} ${open ? styles.open : ""}`} id="marketing-navigation">
          {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
          <div className={styles.actions}><Link href="/login">Log in</Link><ButtonLink href="/signup">Start free trial <span aria-hidden="true">↗</span></ButtonLink></div>
        </div>
      </nav>
    </header>
  );
}

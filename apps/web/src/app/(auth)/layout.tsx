import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { DaifyLogo } from "@/components/brand/daify-logo";
import { restaurantInterior } from "@/lib/assets";
import styles from "./auth.module.css";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <main id="main-content" className={styles.shell}>
    <section className={styles.visual}><Image src={restaurantInterior} alt="Elegant restaurant interior" fill priority sizes="(max-width: 800px) 100vw, 50vw" /><div className={styles.overlay}><Link href="/" aria-label="DAIFY home"><DaifyLogo dark /></Link><blockquote>“The menu should feel like the first chapter of dinner.”</blockquote><p>Production authentication arrives in M3. M1 establishes only the typed, accessible shell.</p></div></section>
    <section className={styles.content}>{children}</section>
  </main>;
}

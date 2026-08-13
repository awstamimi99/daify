"use client";

import type { OrganizationRole } from "@daify/types";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { DaifyLogo } from "@/components/brand/daify-logo";
import { dashboardNavigation } from "@/data/dashboard";
import styles from "./dashboard-shell.module.css";

export function DashboardShell({ children }: { readonly children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<OrganizationRole>("owner");
  const pathname = usePathname();
  const navigation = dashboardNavigation.filter(item => item.roles.includes(role));
  return <div className={styles.shell}>
    <aside className={`${styles.sidebar} ${open ? styles.open : ""}`} id="dashboard-sidebar" aria-label="Dashboard navigation">
      <Link href="/" aria-label="DAIFY marketing home"><DaifyLogo /></Link>
      <div className={styles.restaurant}><span>O</span><div><strong>Oliva</strong><small>Salmiya · Kuwait</small></div></div>
      <nav>{navigation.map(item => <Link key={item.href} href={item.href as Route} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}><span aria-hidden="true">{item.glyph}</span>{item.label}</Link>)}</nav>
      <div className={styles.sidebarNote}><strong>M1 foundation</strong><span>Fixture data only. Authorization begins in M3.</span></div>
    </aside>
    <div className={styles.workspace}>
      <header className={styles.topbar}><button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="dashboard-sidebar">☰ <span>Menu</span></button><div><span className="surface-status">Dinner menu live</span><small>Frontend permission controls are UX—not security.</small></div><label>View as <select value={role} onChange={event => setRole(event.target.value as OrganizationRole)}><option value="owner">Owner</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="viewer">Viewer</option></select></label><div className={styles.avatar} aria-label="Adam Kareem">AK</div></header>
      {children}
    </div>
    {open ? <button className={styles.scrim} type="button" aria-label="Close dashboard navigation" onClick={() => setOpen(false)} /> : null}
  </div>;
}

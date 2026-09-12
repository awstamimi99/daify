"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DaifyLogo } from "@/components/brand/daify-logo";
import { dashboardNavigation } from "@/data/dashboard";
import styles from "./dashboard-shell.module.css";
import type { WebSession } from "@/lib/session";
import type { Workspace } from "@/lib/workspace";

const mobileQuery = "(max-width: 820px)";
function subscribeViewport(callback: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function DashboardShell({ children, session, active, workspaces }: { readonly children: ReactNode; readonly session: WebSession; readonly active: Workspace | null; readonly workspaces: Workspace[] }) {
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mobile = useSyncExternalStore(subscribeViewport, () => window.matchMedia(mobileQuery).matches, () => false);
  const pathname = usePathname();
  const router = useRouter();
  const navigation = dashboardNavigation.filter(item => item.permissions.length === 0 || active && item.permissions.some(permission => active.membership.permissions.includes(permission)));

  async function switchWorkspace(id: string) {
    setSwitchError(null); setSwitching(true);
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error("Switch failed");
      router.push("/dashboard"); router.refresh();
    } catch { setSwitchError("We couldn’t switch workspaces. Please try again."); }
    finally { setSwitching(false); }
  }

  function closeMenu() {
    setOpen(false);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }

  useEffect(() => {
    if (!open || !mobile) return;
    sidebarRef.current?.querySelector<HTMLElement>("button, a, select")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeMenu(); }
      if (event.key !== "Tab") return;
      const elements = sidebarRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled), select:not(:disabled)");
      if (!elements?.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, mobile]);

  async function logout() {
    setLoggingOut(true); setLogoutError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok && response.status !== 401) throw new Error("Logout failed");
      router.replace("/login"); router.refresh();
    } catch {
      setLogoutError("We couldn’t log you out. Please try again.");
    } finally { setLoggingOut(false); }
  }
  return <div className={styles.shell}>
    <aside ref={sidebarRef} inert={mobile && !open} role={mobile && open ? "dialog" : undefined} aria-modal={mobile && open ? true : undefined} className={`${styles.sidebar} ${open ? styles.open : ""}`} id="dashboard-sidebar" aria-label="Dashboard navigation">
      {mobile && open ? <button className={styles.closeMenu} onClick={closeMenu} type="button">Close menu</button> : null}
      <Link href="/" aria-label="DAIFY marketing home"><DaifyLogo /></Link>
      <div className={styles.restaurant}><span>{active?.name.slice(0, 1) ?? "D"}</span><div><strong>{active?.name ?? "Your restaurant"}</strong><small>{active ? `${active.locations.length} locations · ${active.membership.role}` : "Let’s set up your workspace"}</small></div></div>
      {workspaces.length > 1 ? <label>Workspace<select aria-label="Workspace" value={active?.id ?? ""} disabled={switching} onChange={event => void switchWorkspace(event.target.value)}>{workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label> : null}
      {switchError ? <p role="alert">{switchError}</p> : null}
      <nav>{navigation.map(item => <Link key={item.href} href={item.href as Route} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}><span aria-hidden="true">{item.glyph}</span>{item.label}</Link>)}</nav>
      <div className={styles.sidebarNote}><strong>{session.user.displayName ?? "Your account"}</strong><span>{session.user.email}</span></div>
    </aside>
    <div className={styles.workspace} inert={mobile && open}>
      <header className={styles.topbar}><button className={styles.menuToggle} ref={toggleRef} type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="dashboard-sidebar"><span aria-hidden="true">☰</span> <span>Menu</span></button><div><span className="surface-status">Your workspace</span></div><button className={styles.logout} type="button" disabled={loggingOut} onClick={() => void logout()}>{loggingOut ? "Logging out…" : "Log out"}</button><div className={styles.avatar} aria-label={session.user.displayName ?? session.user.email}>{(session.user.displayName ?? session.user.email).slice(0, 2).toUpperCase()}</div></header>
      {logoutError ? <p className={styles.logoutError} role="alert">{logoutError}</p> : null}
      {children}
    </div>
    {open && mobile ? <button className={styles.scrim} tabIndex={-1} type="button" aria-label="Close dashboard navigation" onClick={closeMenu} /> : null}
  </div>;
}

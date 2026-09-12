import Link from "next/link";
import { Card } from "@daify/ui";
import styles from "./overview.module.css";
import { requireSession } from "@/lib/session";
import { getWorkspaceContext } from "@/lib/workspace";
import { WorkspaceSetup } from "@/components/dashboard/workspace-setup";

export default async function DashboardOverview() {
  const session = await requireSession();
  const { active } = await getWorkspaceContext();
  const firstName = session.user.displayName?.split(/\s+/)[0] ?? "there";
  return <main id="main-content" className={styles.main}>
    <header className={styles.heading}><div><span className="eyebrow">{active?.name ?? "Your first restaurant"}</span><h1>Welcome, {firstName}.</h1><p>{active ? "Your restaurant, locations and team start here." : "Create your restaurant workspace to get started. If you were invited to a team, open the link in your invitation email."}</p></div></header>
    {!active ? <Card className={styles.menuCard}><h2>Create your workspace</h2><WorkspaceSetup /></Card> : <>
      <section className={styles.stats} aria-label="Workspace summary">
        <Card className={styles.stat}><span>Restaurant</span><strong>{active.name}</strong><small>{active.slug}</small></Card>
        <Card className={styles.stat}><span>Your locations</span><strong>{active.locations.length}</strong><small>Locations you can access</small></Card>
        <Card className={styles.stat}><span>Your role</span><strong>{active.membership.role}</strong><small>Access is managed by your organization</small></Card>
      </section>
      <section className={styles.columns}>
        <Card className={styles.menuCard}><h2>Locations</h2>{active.locations.length ? <div className={styles.sections}>{active.locations.map(location => <div key={location.id}><span>{location.name}</span><b>{location.currency} · {location.defaultLanguage}</b></div>)}</div> : active.membership.permissions.includes("location.manage") ? <><p>Add the first location for your restaurant.</p><WorkspaceSetup organizationId={active.id} /></> : <p>No locations have been assigned to you. Ask an owner to update your access.</p>}</Card>
        <Card className={styles.next}><span className="eyebrow">Your menus</span><h2>Make every dish count.</h2><p>Add sections, dishes, translations and images to your private menu drafts.</p>{active.membership.permissions.includes("menu.read") ? <Link href="/dashboard/menus">Open menus →</Link> : <p>Ask an owner for menu access.</p>}</Card>
      </section>
    </>}
  </main>;
}

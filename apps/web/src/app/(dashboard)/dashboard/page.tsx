import { getTranslator } from '@/lib/i18n/server';
import Link from "next/link";
import { Card } from "@daify/ui";
import styles from "./overview.module.css";
import { requireSession } from "@/lib/session";
import { getWorkspaceContext } from "@/lib/workspace";
import { WorkspaceSetup } from "@/components/dashboard/workspace-setup";

export default async function DashboardOverview() {
  const t = await getTranslator();
  const session = await requireSession();
  const { active } = await getWorkspaceContext();
  const firstName = session.user.displayName?.split(/\s+/)[0] ?? "";
  return <main id="main-content" className={styles.main}>
    <header className={styles.heading}><div><span className="eyebrow">{active?.name ?? t("Your first restaurant")}</span><h1>{t("Welcome, ")}{firstName}.</h1><p>{active ? t("Your restaurant, locations and team start here.") : t("Create your restaurant workspace to get started. If you were invited to a team, open the link in your invitation email.")}</p></div></header>
    {!active ? <Card className={styles.menuCard}><h2>{t("Create your workspace")}</h2><WorkspaceSetup /></Card> : <>
      <section className={styles.stats} aria-label={t("Workspace summary")}>
        <Card className={styles.stat}><span>{t("Restaurant")}</span><strong>{active.name}</strong><small>{active.slug}</small></Card>
        <Card className={styles.stat}><span>{t("Your locations")}</span><strong>{active.locations.length}</strong><small>{t("Locations you can access")}</small></Card>
        <Card className={styles.stat}><span>{t("Your role")}</span><strong>{t(active.membership.role)}</strong><small>{t("Access is managed by your organization")}</small></Card>
      </section>
      <section className={styles.columns}>
        <Card className={styles.menuCard}><h2>{t("Locations")}</h2>{active.locations.length ? <div className={styles.sections}>{active.locations.map(location => <div key={location.id}><span>{location.name}</span><b>{location.currency} · {location.defaultLanguage}</b></div>)}</div> : active.membership.permissions.includes("location.manage") ? <><p>{t("Add the first location for your restaurant.")}</p><WorkspaceSetup organizationId={active.id} /></> : <p>{t("No locations have been assigned to you. Ask an owner to update your access.")}</p>}</Card>
        <Card className={styles.next}><span className="eyebrow">{t("Your menus")}</span><h2>{t("Make every dish count.")}</h2><p>{t("Add sections, dishes, translations and images to your private menu drafts.")}</p>{active.membership.permissions.includes("menu.read") ? <Link href="/dashboard/menus">{t("Open menus →")}</Link> : <p>{t("Ask an owner for menu access.")}</p>}</Card>
      </section>
    </>}
  </main>;
}

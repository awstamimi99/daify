import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace";
import { apiFetch } from "@/lib/api";
import { MenuWorkspace } from "@/components/dashboard/menu-workspace";
import type { DraftMenuSummary } from "@daify/types";
import styles from "../overview.module.css";

export const metadata = { title: "Menus", robots: { index: false, follow: false } };
export default async function MenusPage() {
  const { active } = await getWorkspaceContext();
  if (!active?.membership.permissions.includes("menu.read")) notFound();
  const location = active.locations[0];
  let menus: DraftMenuSummary[] = [];
  if (location) {
    const response = await apiFetch(`/api/v1/organizations/${active.id}/locations/${location.id}/menus`, { headers: { cookie: (await cookies()).toString() } });
    if (!response.ok) throw new Error("Your menus could not be loaded.");
    menus = await response.json() as DraftMenuSummary[];
  }
  return <main id="main-content" className={styles.main}><header className={styles.heading}><div><span className="eyebrow">{active.name}</span><h1>Your menus.</h1><p>Create and refine your menu, one dish at a time.</p></div></header><MenuWorkspace workspace={active} initialMenus={menus} /></main>;
}

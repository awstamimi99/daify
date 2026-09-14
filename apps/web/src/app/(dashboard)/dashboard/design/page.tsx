import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getWorkspaceContext } from '@/lib/workspace';
import { apiFetch } from '@/lib/api';
import { PublishingWorkspace } from '@/components/dashboard/publishing-workspace';
import type { DraftMenuSummary } from '@daify/types';
import styles from '../overview.module.css';
export const metadata = { title: 'Design your menu.', robots: { index: false, follow: false } };
export default async function Page() {
  const { active } = await getWorkspaceContext();
  if (!active?.membership.permissions.some(permission => ['menu.design'].includes(permission))) notFound();
  let menus: DraftMenuSummary[] = [];
  if (active.locations[0]) { const response = await apiFetch(`/api/v1/organizations/${active.id}/locations/${active.locations[0].id}/menus`,{ headers: { cookie: (await cookies()).toString() } }); if (!response.ok) throw new Error('Menus could not be loaded.'); menus = await response.json() as DraftMenuSummary[]; }
  return <main id="main-content" className={styles.main}><header className={styles.heading}><div><span className="eyebrow">{active.name}</span><h1>Design your menu.</h1><p>Make it yours. Preview every change before publishing.</p></div></header><PublishingWorkspace workspace={active} initialMenus={menus} mode="design" /></main>;
}

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { AnalyticsReport } from '@daify/types';
import { apiFetch } from '@/lib/api';
import { getWorkspaceContext } from '@/lib/workspace';
import { AnalyticsWorkspace } from '@/components/dashboard/analytics-workspace';
import styles from '../overview.module.css';
export const metadata = { title: 'Analytics', robots: { index: false, follow: false } };
export default async function AnalyticsPage() {
  const { active } = await getWorkspaceContext();
  if (!active?.membership.permissions.includes('analytics.read')) notFound();
  const response = await apiFetch(`/api/v1/organizations/${active.id}/analytics`, { headers: { cookie: (await cookies()).toString() } });
  if (!response.ok) throw new Error('Analytics could not be loaded. Please retry.');
  return <main id="main-content" className={styles.main}><AnalyticsWorkspace organizationId={active.id} name={active.name} initial={await response.json() as AnalyticsReport} /></main>;
}

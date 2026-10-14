import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { BillingState } from '@daify/types';
import { apiFetch } from '@/lib/api';
import { requireSession } from '@/lib/session';
import { getWorkspaceContext } from '@/lib/workspace';
import { BillingWorkspace } from '@/components/dashboard/billing-workspace';
import styles from '../overview.module.css';
export const metadata = { title: 'Billing', robots: { index: false, follow: false } };
export default async function BillingPage() {
  const { active } = await getWorkspaceContext();
  if (!active?.membership.permissions.includes('billing.read')) notFound();
  const session = await requireSession();
  const response = await apiFetch(`/api/v1/organizations/${active.id}/billing`, { headers: { cookie: (await cookies()).toString() } });
  if (!response.ok) throw new Error('Billing could not be loaded. Please retry.');
  return <main id="main-content" className={styles.main}><BillingWorkspace organizationId={active.id} name={active.name} initial={await response.json() as BillingState} canManage={active.membership.permissions.includes('billing.manage')} strongSession={session.user.assuranceLevel === 'AAL2'} /></main>;
}

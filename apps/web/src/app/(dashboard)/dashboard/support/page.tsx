import { notFound } from 'next/navigation';
import { getWorkspaceContext } from '@/lib/workspace';
import { SupportWorkspace } from '@/components/support/support-workspace';
import styles from '../overview.module.css';
export const metadata = { title: 'Support', robots: { index: false, follow: false } };
export default async function SupportPage() {
  const { active } = await getWorkspaceContext();
  if (!active?.membership.permissions.includes('support.manage')) notFound();
  return <main id="main-content" className={styles.main}><SupportWorkspace organizationId={active.id} /></main>;
}

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { requireSession } from '@/lib/session';
import { getWorkspaceContext } from '@/lib/workspace';
import { apiFetch } from '@/lib/api';
import { CustomerOffers } from '@/components/offers/customer-offers';
import type { CustomerOfferState } from '@/components/offers/types';
export const metadata = { title: 'Your offers — DAIFY', robots: { index: false, follow: false } };
export default async function Page() {
  const { user } = await requireSession(); const { active } = await getWorkspaceContext();
  if (!active || !active.membership.permissions.includes('billing.read')) redirect('/dashboard');
  const response = await apiFetch(`/api/v1/organizations/${active.id}/offers`, { headers: { cookie: (await cookies()).toString() } });
  if (!response.ok) throw new Error('Your offers could not be loaded. Please try again.');
  return <main id="main-content"><CustomerOffers organizationId={active.id} initial={await response.json() as CustomerOfferState} canAccept={user.assuranceLevel === 'AAL2' && active.membership.permissions.includes('billing.manage')} /></main>;
}

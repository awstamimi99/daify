import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/session';
import { OffersWorkspace } from '@/components/offers/offers-workspace';
export const metadata = { title: 'Coupons & customer quotes — DAIFY', robots: { index: false, follow: false } };
export default async function Page() {
  const { user } = await requirePlatformAdmin();
  if (!user.platformAdmin && !user.platformStaff?.permissions.includes('offers.read')) redirect('/admin');
  return <OffersWorkspace userId={user.id} email={user.email} owner={user.platformAdmin} permissions={user.platformStaff?.permissions ?? []} />;
}

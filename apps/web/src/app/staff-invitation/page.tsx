import { getSession } from '@/lib/session';
import { StaffInvitation } from '@/components/admin/staff-invitation';
import { redirect } from 'next/navigation';
export const metadata = { title: 'Join DAIFY staff', robots: { index: false, follow: false } };
export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/login?next=/staff-invitation');
  const { user } = session;
  return <StaffInvitation email={user.email} mfa={user.assuranceLevel === 'AAL2'} />;
}

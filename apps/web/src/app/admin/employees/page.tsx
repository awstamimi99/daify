import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/session';
import { EmployeeWorkspace } from '@/components/admin/employee-workspace';

export const metadata = { title: 'Employees & permissions — DAIFY', robots: { index: false, follow: false } };
export default async function Page() {
  const { user } = await requirePlatformAdmin();
  if (!user.platformAdmin && !user.platformStaff?.permissions.includes('staff.manage')) redirect('/admin');
  return <EmployeeWorkspace email={user.email} owner={user.platformAdmin} role={user.platformStaff?.role ?? 'OWNER'} />;
}

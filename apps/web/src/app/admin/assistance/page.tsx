import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/session';
import { AssistanceWorkspace } from '@/components/admin/assistance-workspace';
export const metadata = { title: 'Client menu assistance — DAIFY', robots: { index: false, follow: false } };
export default async function Page() {
  const { user } = await requirePlatformAdmin();
  if (!user.platformAdmin && !user.platformStaff?.permissions.includes('menus.read')) redirect('/admin');
  return <AssistanceWorkspace />;
}

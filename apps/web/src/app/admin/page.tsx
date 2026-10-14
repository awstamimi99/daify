import { requirePlatformAdmin } from "@/lib/session";
import { AdminWorkspace } from '@/components/admin/admin-workspace';

export const metadata = { title: "Platform Admin — DAIFY", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const session = await requirePlatformAdmin();
  return <AdminWorkspace email={session.user.email} />;
}

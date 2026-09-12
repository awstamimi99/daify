import { requirePlatformAdmin } from "@/lib/session";

export const metadata = { title: "Platform Admin — DAIFY", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const session = await requirePlatformAdmin();
  return <main className="empty-state"><div><span className="eyebrow">Platform Admin</span><h1>Secure operator boundary.</h1><p>{session.user.email} is authenticated with AAL2. Administrative data is fetched only through audited NestJS platform endpoints.</p></div></main>;
}

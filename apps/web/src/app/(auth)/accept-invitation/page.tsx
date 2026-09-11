import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AcceptInvitation } from "@/components/auth/accept-invitation";

export const metadata = { title: "Join your team — DAIFY", robots: { index: false, follow: false } };
export default async function AcceptInvitationPage({ searchParams }: { readonly searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const session = await getSession();
  if (!session) redirect(`/login?${new URLSearchParams({ next: `/accept-invitation?${new URLSearchParams({ token })}` })}`);
  return <AcceptInvitation token={token} email={session.user.email} />;
}

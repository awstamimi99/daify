import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "./api";

export interface WebSession {
  user: { id: string; email: string; displayName: string | null; platformAdmin: boolean; assuranceLevel: "AAL1" | "AAL2" };
}

export async function getSession(): Promise<WebSession | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;
  const response = await apiFetch("/api/v1/auth/me", { headers: { cookie: cookieHeader } });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("The account service is unavailable. Please try again.");
  return response.json() as Promise<WebSession>;
}

export async function requireSession(): Promise<WebSession> {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");
  return session;
}

export async function requirePlatformAdmin(): Promise<WebSession> {
  const session = await requireSession();
  if (!session.user.platformAdmin || session.user.assuranceLevel !== "AAL2") redirect("/dashboard");
  return session;
}

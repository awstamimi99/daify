import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace";
import { apiFetch } from "@/lib/api";
import { TeamManagement } from "@/components/dashboard/team-management";
import type { TeamMember } from "@/components/dashboard/team-management";
import styles from "../overview.module.css";

export default async function TeamPage() {
  const { active } = await getWorkspaceContext();
  if (!active?.membership.permissions.includes("team.manage")) notFound();
  const response = await apiFetch(`/api/v1/organizations/${active.id}/members`, { headers: { cookie: (await cookies()).toString() } });
  if (!response.ok) throw new Error("Your team could not be loaded.");
  const members = await response.json() as TeamMember[];
  return <main id="main-content" className={styles.main}><header className={styles.heading}><div><span className="eyebrow">{active.name}</span><h1>Your team.</h1><p>Invite people and manage their access to your restaurant.</p></div></header><TeamManagement workspace={active} members={members} /></main>;
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireSession } from "@/lib/session";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s — DAIFY Dashboard" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireSession();
  const { workspaces, active } = await getWorkspaceContext();
  return <DashboardShell session={session} workspaces={workspaces} active={active}>{children}</DashboardShell>;
}

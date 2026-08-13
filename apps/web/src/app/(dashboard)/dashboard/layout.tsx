import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s — DAIFY Dashboard" }, robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) { return <DashboardShell>{children}</DashboardShell>; }

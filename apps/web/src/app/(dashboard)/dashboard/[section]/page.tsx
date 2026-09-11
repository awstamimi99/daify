import { notFound } from "next/navigation";
import { Card } from "@daify/ui";
import { dashboardNavigation } from "@/data/dashboard";
import { getWorkspaceContext } from "@/lib/workspace";
import styles from "../overview.module.css";

interface PageProps { readonly params: Promise<{ section: string }> }

export function generateStaticParams() { return dashboardNavigation.filter(item => item.href !== "/dashboard").map(item => ({ section: item.href.split("/").at(-1) ?? "" })); }

export default async function DashboardSection({ params }: PageProps) {
  const section = (await params).section;
  const item = dashboardNavigation.find(candidate => candidate.href === `/dashboard/${section}`);
  const { active } = await getWorkspaceContext();
  if (!item || !active || !item.permissions.some(permission => active.membership.permissions.includes(permission))) notFound();
  return <main id="main-content" className={styles.main}><header className={styles.heading}><div><span className="eyebrow">Your workspace</span><h1>{item.label}</h1><p>This part of your workspace is being prepared.</p></div></header><Card className={styles.menuCard}><h2 className="serif">Coming next.</h2><p>Your account and workspace are saved. This feature will be available when its setup is complete.</p></Card></main>;
}

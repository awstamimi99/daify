import { getTranslator } from '@/lib/i18n/server';
import { notFound } from "next/navigation";
import { Card } from "@daify/ui";
import { dashboardNavigation } from "@/data/dashboard";
import { getWorkspaceContext } from "@/lib/workspace";
import styles from "../overview.module.css";

interface PageProps { readonly params: Promise<{ section: string }> }


export default async function DashboardSection({ params }: PageProps) {
  const t = await getTranslator();
  const section = (await params).section;
  const item = dashboardNavigation.find(candidate => candidate.href === `/dashboard/${section}`);
  const { active } = await getWorkspaceContext();
  if (!item || !active || !item.permissions.some(permission => active.membership.permissions.includes(permission))) notFound();
  return <main id="main-content" className={styles.main}><header className={styles.heading}><div><span className="eyebrow">{t("Your workspace")}</span><h1>{t(item.label)}</h1><p>{t("This part of your workspace is being prepared.")}</p></div></header><Card className={styles.menuCard}><h2 className="serif">{t("Coming next.")}</h2><p>{t("Your account and workspace are saved. This feature will be available when its setup is complete.")}</p></Card></main>;
}

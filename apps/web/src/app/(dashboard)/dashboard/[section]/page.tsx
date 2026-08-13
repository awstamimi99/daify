import { notFound } from "next/navigation";
import { Card } from "@daify/ui";
import { dashboardNavigation } from "@/data/dashboard";
import styles from "../overview.module.css";

interface PageProps { readonly params: Promise<{ section: string }> }

export function generateStaticParams() { return dashboardNavigation.filter(item => item.href !== "/dashboard").map(item => ({ section: item.href.split("/").at(-1) ?? "" })); }

export default async function DashboardSection({ params }: PageProps) {
  const section = (await params).section;
  const item = dashboardNavigation.find(candidate => candidate.href === `/dashboard/${section}`);
  if (!item) notFound();
  return <main id="main-content" className={styles.main}><header className={styles.heading}><div><span className="eyebrow">M1 shell route</span><h1>{item.label}</h1><p>This route proves the scalable dashboard layout. Domain behavior arrives in its owning milestone.</p></div></header><Card className={styles.menuCard}><h2 className="serif">Structure before simulation.</h2><p>DAIFY does not add temporary API or backend behavior here. The shell, routing, responsive navigation, states, and permission-aware UI are real; persisted product data starts in M2–M4.</p></Card></main>;
}

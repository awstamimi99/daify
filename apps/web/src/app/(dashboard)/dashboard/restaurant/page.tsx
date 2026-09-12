import { notFound } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace";
import { LocationManagement } from "@/components/dashboard/location-management";
import styles from "../overview.module.css";
export default async function RestaurantPage() {
  const { active } = await getWorkspaceContext();
  if (!active?.membership.permissions.includes("organization.read")) notFound();
  return <main id="main-content" className={styles.main}><header className={styles.heading}><div><span className="eyebrow">{active.name}</span><h1>Your locations.</h1><p>Manage the branches where your menus live.</p></div></header><LocationManagement workspace={active} /></main>;
}

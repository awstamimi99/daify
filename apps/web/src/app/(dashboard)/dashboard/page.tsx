import { ButtonLink, Card } from "@daify/ui";
import { overviewStats } from "@/data/dashboard";
import styles from "./overview.module.css";

export default function DashboardOverview() {
  return <main id="main-content" className={styles.main}>
    <header className={styles.heading}><div><span className="eyebrow">Oliva · Salmiya</span><h1>Good evening, Adam.</h1><p>Here’s what guests are seeing and what your team can do next.</p></div><ButtonLink href="/templates/atelier-preview">Preview menu <span aria-hidden="true">↗</span></ButtonLink></header>
    <section className={styles.stats} aria-label="Restaurant summary">{overviewStats.map(stat => <Card key={stat.label} className={styles.stat}><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.note}</small></Card>)}</section>
    <section className={styles.columns}>
      <Card className={styles.menuCard}><div className={styles.cardHead}><div><span className="eyebrow">Live menu</span><h2>Dinner</h2></div><span className="surface-status">Published</span></div><div className={styles.sections}>{[["Starters",7],["Salads",3],["Main courses",6],["Desserts",4]].map(([name,count]) => <div key={String(name)}><span>{name}</span><b>{count} items</b></div>)}</div><div className={styles.cardActions}><ButtonLink href="/dashboard/menus">Edit menu</ButtonLink><ButtonLink variant="secondary" href="/dashboard/design">Customize design</ButtonLink></div></Card>
      <Card className={styles.next}><span className="eyebrow">Next best action</span><h2>Keep every table current.</h2><p>Your Dinner menu is live. Use the stable preview route to review the new typed template contract before M5 publishing work begins.</p><ButtonLink variant="secondary" href="/templates/atelier-preview">Open Atelier proof</ButtonLink></Card>
    </section>
  </main>;
}

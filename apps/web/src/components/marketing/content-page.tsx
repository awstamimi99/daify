import { ButtonLink, Card } from "@daify/ui";
import type { MarketingPageData } from "@/data/marketing";
import { getLegalDocument } from "@/data/legal";
import { ContactForm } from "./contact-form";
import { LegalPage } from "./legal-page";
import { PricingPlans } from "./pricing-plans";
import { TemplatesCatalog } from "./templates-catalog";
import styles from "./content-page.module.css";

export function ContentPage({ page }: { readonly page: MarketingPageData }) {
  const legal = getLegalDocument(page.slug);
  if (legal) return <LegalPage document={legal} />;
  if (page.slug === "templates") return <main id="main-content"><PageHero page={page} primaryHref="#template-collection-title" primaryLabel="Browse all nine" /><TemplatesCatalog /></main>;
  if (page.slug === "pricing") return <main id="main-content"><PageHero page={page} primaryHref="#plans" primaryLabel="Compare plans" /><PricingPlans /></main>;
  if (page.slug === "contact") return <ContactPage page={page} />;
  return <EditorialPage page={page} />;
}

function PageHero({ page, primaryHref = "/signup", primaryLabel = "Start free trial" }: { readonly page: MarketingPageData; readonly primaryHref?: string; readonly primaryLabel?: string }) {
  return <section className={styles.hero}><div className="container"><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.description}</p><div className={styles.actions}><ButtonLink href={primaryHref}>{primaryLabel} <span aria-hidden="true">↗</span></ButtonLink><ButtonLink variant="secondary" href={page.slug === "features" ? "/templates" : "/contact"}>{page.slug === "features" ? "Explore templates" : "Talk to DAIFY"}</ButtonLink></div></div></section>;
}

function EditorialPage({ page }: { readonly page: MarketingPageData }) {
  const isFeatures = page.slug === "features";
  return <main id="main-content" className={styles.main}>
    <PageHero page={page} />
    <section className={styles.editorial}><div className="container"><div className={styles.sectionHead}><span className="eyebrow">{isFeatures ? "The complete flow" : "What guides the work"}</span><h2>{isFeatures ? "Built around service—not software theater." : "Digital convenience can still feel hospitable."}</h2></div><div className={styles.grid}>{page.highlights.map((item, index) => <Card key={item.title} className={styles.card}><small>0{index + 1}</small><h3>{item.title}</h3><p>{item.copy}</p></Card>)}</div></div></section>
    {isFeatures ? <section className={styles.flow}><div className="container"><span className="eyebrow">From edit to table</span><h2>Change it once.<br />See it everywhere.</h2><div>{["Edit the live menu draft", "Review the guest experience", "Publish behind the same QR"].map((item, index) => <article key={item}><b>0{index + 1}</b><span>{item}</span></article>)}</div></div></section> : <section className={styles.manifesto}><div className="container"><p>DAIFY begins with a small belief: the moment after a guest scans should feel like the restaurant they chose—not like opening an office document.</p><div><span>Kuwait rooted</span><span>Hospitality minded</span><span>Built bilingually</span></div></div></section>}
  </main>;
}

function ContactPage({ page }: { readonly page: MarketingPageData }) {
  return <main id="main-content"><section className={styles.contact}><div className={`container ${styles.contactGrid}`}><div><span className="eyebrow">{page.eyebrow}</span><h1>Let’s make your menu feel <em>remarkable.</em></h1><p>Whether you run one neighbourhood café or a growing hospitality group, tell us where you want to go. We’ll help you find the clearest way there.</p><div className={styles.promises}><span><b>01</b>A thoughtful reply</span><span><b>02</b>No hard sell</span><span><b>03</b>Usually within one business day</span></div><div className={styles.direct}><span>Prefer email?<a href="mailto:hello@daify.net">hello@daify.net ↗</a></span><span>Based in<strong>Kuwait · Working worldwide</strong></span></div></div><ContactForm /></div></section></main>;
}

"use client";
import { useI18n } from '@/components/i18n/language-provider';
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
  const { t } = useI18n();
  return <section className={styles.hero}><div className="container"><span className="eyebrow">{t(page.eyebrow)}</span><h1>{t(page.title)}</h1><p>{t(page.description)}</p><div className={styles.actions}><ButtonLink href={primaryHref}>{t(primaryLabel)} <span aria-hidden="true">↗</span></ButtonLink><ButtonLink variant="secondary" href={page.slug === "features" ? "/templates" : "/contact"}>{page.slug === "features" ? t("Explore templates") : t("Talk to DAIFY")}</ButtonLink></div></div></section>;
}

function EditorialPage({ page }: { readonly page: MarketingPageData }) {
  const { t } = useI18n();
  const isFeatures = page.slug === "features";
  return <main id="main-content" className={styles.main}>
    <PageHero page={page} />
    <section className={styles.editorial}><div className="container"><div className={styles.sectionHead}><span className="eyebrow">{isFeatures ? t("The complete flow") : t("What guides the work")}</span><h2>{isFeatures ? t("Built around service—not software theater.") : t("Digital convenience can still feel hospitable.")}</h2></div><div className={styles.grid}>{page.highlights.map((item, index) => <Card key={t(item.title)} className={styles.card}><small>0{index + 1}</small><h3>{t(item.title)}</h3><p>{t(item.copy)}</p></Card>)}</div></div></section>
    {isFeatures ? <section className={styles.flow}><div className="container"><span className="eyebrow">{t("From edit to table")}</span><h2>{t("Change it once.")}<br />{t("See it everywhere.")}</h2><div>{["Edit the live menu draft", "Review the guest experience", "Publish behind the same QR"].map((item, index) => <article key={t(item)}><b>0{index + 1}</b><span>{t(item)}</span></article>)}</div></div></section> : <section className={styles.manifesto}><div className="container"><p>{t("DAIFY begins with a small belief: the moment after a guest scans should feel like the restaurant they chose—not like opening an office document.")}</p><div><span>{t("Kuwait rooted")}</span><span>{t("Hospitality minded")}</span><span>{t("Built bilingually")}</span></div></div></section>}
  </main>;
}

function ContactPage({ page }: { readonly page: MarketingPageData }) {
  const { t } = useI18n();
  return <main id="main-content"><section className={styles.contact}><div className={`container ${styles.contactGrid}`}><div><span className="eyebrow">{t(page.eyebrow)}</span><h1>{t("Let’s make your menu feel ")}<em>{t("remarkable.")}</em></h1><p>{t("Whether you run one neighbourhood café or a growing hospitality group, tell us where you want to go. We’ll help you find the clearest way there.")}</p><div className={styles.promises}><span><b>01</b>{t("A thoughtful reply")}</span><span><b>02</b>{t("No hard sell")}</span><span><b>03</b>{t("Usually within one business day")}</span></div><div className={styles.direct}><span>{t("Prefer email?")}<a href="mailto:hello@daify.net">{t("hello@daify.net ↗")}</a></span><span>{t("Based in")}<strong>{t("Kuwait · Working worldwide")}</strong></span></div></div><ContactForm /></div></section></main>;
}

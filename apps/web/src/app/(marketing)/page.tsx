import { getTranslator } from '@/lib/i18n/server';
import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink, Card } from "@daify/ui";
import { atelierCover, charredOctopus, feastCover, guestScan, heroOliva, soukCover, truffleRigatoni } from "@/lib/assets";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "DAIFY — Digital menus made remarkable",
  alternates: { canonical: "/" },
  openGraph: { title: "DAIFY — Digital menus made remarkable", url: "/" },
};

const steps = [
  ["01", "Build", "Shape sections, dishes, prices, notes, and availability around the way your menu actually works."],
  ["02", "Style", "Choose a distinct art direction, then tune the details without flattening its personality."],
  ["03", "Publish", "Make deliberate changes live while every printed QR stays exactly where it is."],
] as const;

const featuredTemplates = [
  { image: atelierCover, name: "Atelier", category: "Fine dining" },
  { image: feastCover, name: "Feast", category: "Modern food menu" },
  { image: soukCover, name: "Souk", category: "Middle Eastern" },
] as const;

export default async function HomePage() {
  const t = await getTranslator();
  return <main id="main-content">
    <section className={styles.hero}>
      <div className={`container ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <span className="eyebrow">{t("The menu experience, reimagined")}</span>
          <h1>{t("Your restaurant deserves more than a PDF.")}</h1>
          <p>{t("Turn every scan into a fast, beautiful expression of your brand. Build once, update instantly, and give every guest a menu made for the phone already in their hand.")}</p>
          <div className={styles.actions}><ButtonLink href="/signup">{t("Build your menu ")}<span aria-hidden="true">↗</span></ButtonLink><ButtonLink variant="secondary" href="/templates">{t("Explore templates")}</ButtonLink></div>
          <div className={styles.trust}><span>{t("✓ 14-day Pro access")}</span><span>{t("✓ Publish in minutes")}</span><span>{t("✓ No guest app")}</span></div>
        </div>
        <div className={styles.stage} aria-label={t("DAIFY menu builder and mobile menu preview")}>
          <Image src={heroOliva} alt={t("Mediterranean restaurant at blue hour")} fill priority sizes="(max-width: 860px) 100vw, 48vw" />
          <div className={styles.editor}><header><span>{t("Oliva / Dinner")}</span><b>{t("Live")}</b></header><small>{t("Main courses")}</small><article><Image src={truffleRigatoni} alt="" width={48} height={48} /><span><strong>{t("Truffle rigatoni")}</strong><small>{t("Wild mushroom · parmesan")}</small></span><b>{t("KD 6.5")}</b></article><article><Image src={charredOctopus} alt="" width={48} height={48} /><span><strong>{t("Charred octopus")}</strong><small>{t("Chickpea · paprika")}</small></span><b>{t("KD 8.0")}</b></article></div>
          <div className={styles.phone}><small>{t("MEDITERRANEAN KITCHEN")}</small><h2>{t("Oliva")}</h2><p>{t("Sea bass ")}<b>{t("KD 8.5")}</b></p><p>{t("Wild mushroom orzo ")}<b>{t("KD 6.0")}</b></p></div>
        </div>
      </div>
    </section>

    <section className={styles.ribbon} aria-label={t("Product capabilities")}><div>{t("Build ")}<i /> {t("Style ")}<i /> {t("Preview ")}<i /> {t("Publish ")}<i /> {t("Scan ")}<i /> {t("Understand")}</div></section>

    <section className={styles.guest}>
      <div className="container"><div className={styles.sectionHead}><div><span className="eyebrow">{t("The guest experience")}</span><h2 className="serif">{t("Dinner starts before the first bite.")}</h2></div><p>{t("One quiet scan becomes a beautifully branded moment—fast to open, effortless to explore, and designed to feel like your restaurant.")}</p></div>
        <figure className={styles.guestImage}><Image src={guestScan} alt={t("Guest scanning a QR menu at an elegant candlelit restaurant")} fill sizes="(max-width: 1200px) 100vw, 1200px" /><figcaption><small>{t("The first five seconds")}</small><strong>{t("No app. No download.")}<br />{t("Just your menu.")}</strong></figcaption></figure>
      </div>
    </section>

    <section className={styles.how} id="how"><div className="container"><span className="eyebrow">{t("A calm workflow")}</span><h2 className="serif">{t("From tonight’s edit")}<br />{t("to tonight’s table.")}</h2><div className={styles.steps}>{steps.map(([number, title, copy]) => <Card key={number} className={styles.step}><small>{number}</small><h3>{t(title)}</h3><p>{t(copy)}</p></Card>)}</div></div></section>

    <section className={styles.templates}><div className="container"><div className={styles.sectionHead}><div><span className="eyebrow">{t("Distinct by design")}</span><h2 className="serif">{t("One menu. Three different moods.")}</h2></div><ButtonLink variant="secondary" href="/templates">{t("See all nine")}</ButtonLink></div><div className={styles.templateGrid}>{featuredTemplates.map(template => <article key={template.name}><Image src={template.image} alt={t("{0} template preview", { "0": template.name })} sizes="(max-width: 760px) 100vw, 33vw" /><div><small>{t(template.category)}</small><h3>{template.name}</h3></div></article>)}</div></div></section>

    <section className={styles.final}><div className="container"><div><span className="eyebrow">{t("Your next service")}</span><h2 className="serif">{t("Make every scan feel considered.")}</h2><p>{t("The foundation is ready for restaurants that want digital convenience without losing hospitality.")}</p><ButtonLink href="/signup">{t("Start free trial ")}<span aria-hidden="true">↗</span></ButtonLink></div></div></section>
  </main>;
}

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

export default function HomePage() {
  return <main id="main-content">
    <section className={styles.hero}>
      <div className={`container ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <span className="eyebrow">The menu experience, reimagined</span>
          <h1>Your restaurant deserves more than a PDF.</h1>
          <p>Turn every scan into a fast, beautiful expression of your brand. Build once, update instantly, and give every guest a menu made for the phone already in their hand.</p>
          <div className={styles.actions}><ButtonLink href="/signup">Build your menu <span aria-hidden="true">↗</span></ButtonLink><ButtonLink variant="secondary" href="/templates">Explore templates</ButtonLink></div>
          <div className={styles.trust}><span>✓ 14-day Pro access</span><span>✓ Publish in minutes</span><span>✓ No guest app</span></div>
        </div>
        <div className={styles.stage} aria-label="DAIFY menu builder and mobile menu preview">
          <Image src={heroOliva} alt="Mediterranean restaurant at blue hour" fill priority sizes="(max-width: 860px) 100vw, 48vw" />
          <div className={styles.editor}><header><span>Oliva / Dinner</span><b>Live</b></header><small>Main courses</small><article><Image src={truffleRigatoni} alt="" width={48} height={48} /><span><strong>Truffle rigatoni</strong><small>Wild mushroom · parmesan</small></span><b>KD 6.5</b></article><article><Image src={charredOctopus} alt="" width={48} height={48} /><span><strong>Charred octopus</strong><small>Chickpea · paprika</small></span><b>KD 8.0</b></article></div>
          <div className={styles.phone}><small>MEDITERRANEAN KITCHEN</small><h2>Oliva</h2><p>Sea bass <b>KD 8.5</b></p><p>Wild mushroom orzo <b>KD 6.0</b></p></div>
        </div>
      </div>
    </section>

    <section className={styles.ribbon} aria-label="Product capabilities"><div>Build <i /> Style <i /> Preview <i /> Publish <i /> Scan <i /> Understand</div></section>

    <section className={styles.guest}>
      <div className="container"><div className={styles.sectionHead}><div><span className="eyebrow">The guest experience</span><h2 className="serif">Dinner starts before the first bite.</h2></div><p>One quiet scan becomes a beautifully branded moment—fast to open, effortless to explore, and designed to feel like your restaurant.</p></div>
        <figure className={styles.guestImage}><Image src={guestScan} alt="Guest scanning a QR menu at an elegant candlelit restaurant" fill sizes="(max-width: 1200px) 100vw, 1200px" /><figcaption><small>The first five seconds</small><strong>No app. No download.<br />Just your menu.</strong></figcaption></figure>
      </div>
    </section>

    <section className={styles.how} id="how"><div className="container"><span className="eyebrow">A calm workflow</span><h2 className="serif">From tonight’s edit<br />to tonight’s table.</h2><div className={styles.steps}>{steps.map(([number, title, copy]) => <Card key={number} className={styles.step}><small>{number}</small><h3>{title}</h3><p>{copy}</p></Card>)}</div></div></section>

    <section className={styles.templates}><div className="container"><div className={styles.sectionHead}><div><span className="eyebrow">Distinct by design</span><h2 className="serif">One menu. Three different moods.</h2></div><ButtonLink variant="secondary" href="/templates">See all nine</ButtonLink></div><div className={styles.templateGrid}>{featuredTemplates.map(template => <article key={template.name}><Image src={template.image} alt={`${template.name} template preview`} sizes="(max-width: 760px) 100vw, 33vw" /><div><small>{template.category}</small><h3>{template.name}</h3></div></article>)}</div></div></section>

    <section className={styles.final}><div className="container"><div><span className="eyebrow">Your next service</span><h2 className="serif">Make every scan feel considered.</h2><p>The foundation is ready for restaurants that want digital convenience without losing hospitality.</p><ButtonLink href="/signup">Start free trial <span aria-hidden="true">↗</span></ButtonLink></div></div></section>
  </main>;
}

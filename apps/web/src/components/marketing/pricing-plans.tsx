"use client";
import { useI18n } from '@/components/i18n/language-provider';

import { ButtonLink } from "@daify/ui";
import { useState } from "react";
import styles from "./pricing-plans.module.css";

interface Plan { readonly id: "starter" | "pro" | "business"; readonly name: string; readonly monthly: number | null; readonly yearly: number | null; readonly total: number | null; readonly badge?: string; readonly tagline: string; readonly features: readonly string[] }

const plans: readonly Plan[] = [
  { id: "starter", name: "Starter", monthly: 10, yearly: 8, total: 96, tagline: "Everything you need to launch your restaurant menu.", features: ["1 restaurant · 1 digital menu", "Arabic + English", "Core templates", "QR code + basic analytics", "Standard support"] },
  { id: "pro", name: "Pro", monthly: 15, yearly: 13, total: 156, badge: "Most popular", tagline: "More flexibility, branding, and insights for growing restaurants.", features: ["Up to 3 menus", "Up to 5 manager accounts", "All templates", "Advanced customization + analytics", "Priority support"] },
  { id: "business", name: "Business", monthly: null, yearly: null, total: null, tagline: "For restaurant groups, franchises, and multi-location brands.", features: ["Custom restaurant and menu limits", "Multi-location dashboard", "Advanced roles and permissions", "Cross-location analytics", "Dedicated onboarding"] },
];

const comparison = [
  ["Restaurants", "1", "1", "Custom"], ["Digital menus", "1", "3", "Custom"], ["Arabic + English", "✓", "✓", "✓"],
  ["Templates", "Core", "All", "Custom"], ["Custom branding", "—", "✓", "✓"], ["Analytics", "Basic", "Advanced", "Cross-location"],
  ["Support", "Standard", "Priority", "Dedicated"],
] as const;

export function PricingPlans() {
  const { t } = useI18n();
  const [yearly, setYearly] = useState(false);
  return <>
    <section className={styles.plans} id="plans"><div className="container">
      <div className={styles.heading}><div><span className="eyebrow">{t("Choose your fit")}</span><h2>{t("Simple enough to start.")}<br />{t("Ready when you grow.")}</h2></div><div><div className={styles.toggle} role="group" aria-label={t("Billing period")}><button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>{t("Monthly")}</button><button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>{t("Yearly ")}<b>{t("Save")}</b></button></div><p>{yearly ? t("Billed annually — two months free") : t("Billed monthly")}</p></div></div>
      <div className={styles.grid}>{plans.map(plan => <article className={`${styles.card} ${plan.badge ? styles.featured : ""}`} key={plan.id}>{plan.badge ? <span className={styles.badge}>{t(plan.badge)}</span> : null}<small>{t(plan.name)}</small><div className={styles.price}>{plan.monthly === null ? <strong>{t("Custom")}</strong> : <><strong>${yearly ? plan.yearly : plan.monthly}</strong><span>{t("/ month")}</span></>}</div>{yearly && plan.total ? <p className={styles.billing}>{t("Billed $")}{plan.total} {t("annually")}</p> : null}<p>{t(plan.tagline)}</p><ul>{plan.features.map(feature => <li key={t(feature)}>✓ {t(feature)}</li>)}</ul><ButtonLink variant={plan.badge ? "light" : "secondary"} href={plan.id === "business" ? "/contact" : `/signup${plan.id === "pro" ? "?plan=pro" : ""}`}>{plan.id === "business" ? t("Contact sales") : t("Start 14-day trial")} <span aria-hidden="true">↗</span></ButtonLink></article>)}</div>
      <p className={styles.note}>{t("Plan availability and final pricing are confirmed in your workspace before purchase.")}</p>
    </div></section>
    <section className={styles.compare}><div className="container"><span className="eyebrow">{t("Plan by plan")}</span><h2>{t("Compare the essentials.")}</h2><div className={styles.tableWrap}><table><thead><tr><th>{t("Feature")}</th><th>{t("Starter")}</th><th>{t("Pro")}</th><th>{t("Business")}</th></tr></thead><tbody>{comparison.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={t(cell)} scope="row">{t(cell)}</th> : <td key={`${row[0]}-${t(cell)}-${index}`}>{t(cell)}</td>)}</tr>)}</tbody></table></div></div></section>
  </>;
}

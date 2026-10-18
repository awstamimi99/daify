"use client";
import { useI18n } from '@/components/i18n/language-provider';

import { Button, TextField } from "@daify/ui";
import { useState } from "react";
import styles from "./contact-form.module.css";

export function ContactForm() {
  const { t } = useI18n();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <div className={styles.success} role="status">
      <span aria-hidden="true">✓</span>
      <h2>{t("Your enquiry is ready.")}</h2>
      <p>{t("This M1 foundation does not transmit contact data. Delivery will be connected to the production backend in a later milestone.")}</p>
      <Button variant="secondary" onClick={() => setSubmitted(false)}>{t("Send another enquiry")}</Button>
    </div>;
  }

  return <form className={styles.form} onSubmit={event => { event.preventDefault(); setSubmitted(true); }}>
    <header><div><span>{t("ENQUIRY / 01")}</span><i aria-hidden="true" /></div><h2>{t("Tell us a little about you.")}</h2><p>{t("Share the essentials and we’ll take it from there.")}</p></header>
    <div className={styles.row}>
      <TextField label={t("Your name")} name="name" autoComplete="name" placeholder={t("How should we address you?")} required />
      <TextField label={t("Work email")} name="email" type="email" autoComplete="email" placeholder={t("you@restaurant.com")} required />
    </div>
    <div className={styles.row}>
      <TextField label={t("Restaurant or group")} name="restaurant" placeholder={t("Your brand name")} required />
      <label className={styles.field} htmlFor="locations"><span>{t("Number of locations")}</span><select id="locations" name="locations"><option value="">{t("Select one")}</option><option value="1">{t("1 location")}</option><option value="2-5">{t("2–5 locations")}</option><option value="6-20">{t("6–20 locations")}</option><option value="21+">{t("21+ locations")}</option></select></label>
    </div>
    <label className={styles.field} htmlFor="message"><span>{t("What would you like to achieve?")}</span><textarea id="message" name="message" placeholder={t("A new launch, multiple venues, a better guest experience…")} required /></label>
    <div className={styles.action}><Button type="submit">{t("Send enquiry ")}<span aria-hidden="true">↗</span></Button><small>{t("Prototype interaction only. Nothing is transmitted or stored.")}</small></div>
  </form>;
}

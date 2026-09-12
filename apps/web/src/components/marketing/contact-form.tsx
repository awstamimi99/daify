"use client";

import { Button, TextField } from "@daify/ui";
import { useState } from "react";
import styles from "./contact-form.module.css";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <div className={styles.success} role="status">
      <span aria-hidden="true">✓</span>
      <h2>Your enquiry is ready.</h2>
      <p>This M1 foundation does not transmit contact data. Delivery will be connected to the production backend in a later milestone.</p>
      <Button variant="secondary" onClick={() => setSubmitted(false)}>Send another enquiry</Button>
    </div>;
  }

  return <form className={styles.form} onSubmit={event => { event.preventDefault(); setSubmitted(true); }}>
    <header><div><span>ENQUIRY / 01</span><i aria-hidden="true" /></div><h2>Tell us a little about you.</h2><p>Share the essentials and we’ll take it from there.</p></header>
    <div className={styles.row}>
      <TextField label="Your name" name="name" autoComplete="name" placeholder="How should we address you?" required />
      <TextField label="Work email" name="email" type="email" autoComplete="email" placeholder="you@restaurant.com" required />
    </div>
    <div className={styles.row}>
      <TextField label="Restaurant or group" name="restaurant" placeholder="Your brand name" required />
      <label className={styles.field} htmlFor="locations"><span>Number of locations</span><select id="locations" name="locations"><option value="">Select one</option><option value="1">1 location</option><option value="2-5">2–5 locations</option><option value="6-20">6–20 locations</option><option value="21+">21+ locations</option></select></label>
    </div>
    <label className={styles.field} htmlFor="message"><span>What would you like to achieve?</span><textarea id="message" name="message" placeholder="A new launch, multiple venues, a better guest experience…" required /></label>
    <div className={styles.action}><Button type="submit">Send enquiry <span aria-hidden="true">↗</span></Button><small>Prototype interaction only. Nothing is transmitted or stored.</small></div>
  </form>;
}

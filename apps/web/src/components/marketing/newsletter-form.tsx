"use client";
import { useI18n } from '@/components/i18n/language-provider';

import { Button } from "@daify/ui";
import { useState } from "react";

export function NewsletterForm() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  return sent ? <p role="status">{t("You’re on the list. We’ll keep it useful.")}</p> : (
    <form onSubmit={event => { event.preventDefault(); setSent(true); }}>
      <label className="sr-only" htmlFor="newsletter-email">{t("Email address")}</label>
      <input id="newsletter-email" name="email" type="email" required placeholder={t("you@restaurant.com")} />
      <Button variant="light" type="submit">{t("Join")}</Button>
    </form>
  );
}

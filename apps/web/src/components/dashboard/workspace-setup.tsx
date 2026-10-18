"use client";
import { useI18n } from '@/components/i18n/language-provider';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@daify/ui";
import styles from "./workspace-forms.module.css";

export function WorkspaceSetup({ organizationId }: { readonly organizationId?: string }) {
  const { t, errorMessage } = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    const form = new FormData(event.currentTarget);
    const location = Boolean(organizationId);
    const body = { name: String(form.get("name")), slug: String(form.get("slug")), timezone: String(form.get("timezone")), ...(location ? { currency: String(form.get("currency")), defaultLanguage: String(form.get("language")) } : { defaultLocale: String(form.get("language")) }) };
    try {
      const response = await fetch(location ? `/api/organizations/${organizationId}/locations` : "/api/organizations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { detail?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.detail) ? result.detail.join(" ") : result.detail ?? "We couldn’t save your changes.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Please try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className={styles.form}>
    <TextField label={organizationId ? t("Location name") : t("Restaurant or group name")} name="name" minLength={2} maxLength={160} required />
    <TextField label={t("Short name")} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} hint={t("Use lowercase English letters, numbers and hyphens, such as oliva-salmiya.")} required />
    <TextField label={t("Time zone")} name="timezone" defaultValue="Asia/Kuwait" required />
    <label className={styles.field}>{t("Menu language ")}<select name="language" defaultValue="en"><option value="en">{t("English")}</option><option value="ar">العربية</option></select></label>
    {organizationId ? <label className={styles.field}>{t("Currency ")}<select name="currency" defaultValue="KWD">{["KWD", "SAR", "AED", "QAR", "BHD", "OMR", "USD", "EUR"].map(currency => <option key={currency}>{currency}</option>)}</select></label> : null}
    {error ? <p role="alert" className={styles.error}>{errorMessage(error)}</p> : null}
    <Button disabled={pending} type="submit">{pending ? t("Saving…") : organizationId ? t("Add location") : t("Create workspace")}</Button>
  </form>;
}

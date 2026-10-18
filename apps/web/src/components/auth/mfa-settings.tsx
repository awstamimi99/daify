"use client";
import { useI18n } from '@/components/i18n/language-provider';

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Card, TextField } from "@daify/ui";
import styles from "../dashboard/workspace-forms.module.css";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function MfaSettings({ initialEnabled, initialRemaining }: { readonly initialEnabled: boolean; readonly initialRemaining: number }) {
  const { t, errorMessage } = useI18n();
  const hydrated = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [setup, setSetup] = useState<{ secret: string; expiresAt: string; account: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!codes) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [codes]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries([...data.entries()].filter(([, value]) => value !== ""));
    try {
      const response = await fetch(`/api/auth/mfa/${setup ? "confirm" : "setup"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { detail?: string | string[]; secret: string; expiresAt: string; account: string; recoveryCodes: string[] };
      if (!response.ok) throw new Error(Array.isArray(result.detail) ? result.detail.join(" ") : result.detail ?? "Your security settings could not be saved.");
      form.reset();
      if (setup) { setCodes(result.recoveryCodes); setSaved(false); setSetup(null); setEnabled(true); setRemaining(result.recoveryCodes.length); }
      else setSetup({ secret: result.secret, expiresAt: result.expiresAt, account: result.account });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The request could not be completed. Please reload to check your security status."); }
    finally { setPending(false); }
  }

  return <Card className={styles.panel}>
    <h2>{codes ? t("Save your recovery codes") : enabled ? t("Two-step verification is on") : t("Set up two-step verification")}</h2>
    {error ? <p className={styles.error} role="alert">{errorMessage(error)}</p> : null}
    {codes ? <>
      <p>{t("Your authenticator is active and other sessions have been signed out. Each recovery code replaces an authenticator code once, together with your password. Save them in a safe place; they will not be shown again.")}</p>
      <ul aria-label={t("Recovery codes")} className={styles.recoveryCodes}>{codes.map(code => <li key={code}><code>{code}</code></li>)}</ul>
      <label className={styles.check}><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} /> {t("I have saved my recovery codes")}</label>
      <Button disabled={!saved} onClick={() => setCodes(null)}>{t("Done")}</Button>
    </> : <>
      {enabled ? <p>{t("You have ")}{remaining} {t("unused recovery codes. Replacing your authenticator also replaces all recovery codes. Your existing authenticator stays active until you confirm the new one.")}</p> : <p>{t("Add DAIFY to your authenticator app. After confirmation, you will need an authenticator code or recovery code when signing in.")}</p>}
      {setup ? <div><p>{t("Add an account manually in your authenticator: issuer ")}<strong>{t("DAIFY")}</strong>{t(", account ")}<strong>{setup.account}</strong>{t(", time-based, 6 digits, 30 seconds, SHA-1.")}</p><TextField id="mfa-setup-key" label={t("Authenticator setup key")} value={setup.secret} readOnly /><p>{t("This setup expires in ten minutes. Keep this key private.")}</p></div> : null}
      <form key={setup ? "confirm" : "setup"} method="post" onSubmit={submit} className={styles.form}>
        <fieldset disabled={!hydrated || pending} className={styles.securityFields}>
          <TextField label={t("Current password")} name="password" type="password" autoComplete="current-password" required maxLength={128} />
          {setup ? <TextField label={t("Code from your new authenticator")} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required /> : enabled ? <>
            <TextField label={t("Current authenticator code")} name="mfaCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" />
            <TextField label={t("Or an unused recovery code")} name="recoveryCode" autoComplete="off" spellCheck={false} />
          </> : null}
          <Button type="submit" disabled={!hydrated || pending}>{pending ? t("Saving…") : setup ? t("Confirm authenticator") : enabled ? t("Replace authenticator") : t("Set up authenticator")}</Button>
        </fieldset>
      </form>
      {setup ? <Button variant="secondary" disabled={pending} onClick={() => { setSetup(null); setError(null); }}>{t("Start again")}</Button> : null}
    </>}
  </Card>;
}

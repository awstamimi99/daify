"use client";

import { Button, TextField } from "@daify/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { AuthMode } from "@/data/auth";
import styles from "./auth-form.module.css";
import type { Route } from "next";

const copy: Record<AuthMode, { title: string; intro: string; action: string }> = {
  login: { title: "Welcome back.", intro: "Return securely to your restaurant workspace.", action: "Log in" },
  signup: { title: "Build your first menu.", intro: "Create your verified DAIFY account—no card required.", action: "Create account" },
  "forgot-password": { title: "Reset your password.", intro: "If the account exists, we’ll send a secure one-time reset link.", action: "Send reset link" },
  "reset-password": { title: "Choose a new password.", intro: "A successful reset revokes every existing session.", action: "Reset password" },
  "resend-verification": { title: "Verify your email.", intro: "Request a new verification link for your account.", action: "Send verification link" },
};

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function AuthForm({ mode }: { readonly mode: AuthMode }) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const details = copy[mode];
  const needsName = mode === "signup";
  const needsPassword = mode === "login" || mode === "signup" || mode === "reset-password";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = {};
    form.forEach((value, key) => { const text = String(value); if (text !== "") body[key] = text; });
    if (mode === "reset-password") body.token = searchParams.get("token") ?? "";
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { detail?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.detail) ? result.detail.join(" ") : result.detail ?? "Request failed.");
      if (mode === "login") {
        const next = searchParams.get("next");
        const target = next && /^\/(dashboard|admin|accept-invitation)(?:[/?]|$)/.test(next) && !/[\\\r\n]/.test(next) ? next : "/dashboard";
        router.push(target as Route); router.refresh(); return;
      }
      setMessage(mode === "signup" ? "Account created. Check your email to verify it before logging in." : mode === "resend-verification" ? "If your account needs verification, a new link is on its way." : mode === "forgot-password" ? "If that account exists, a reset link is on its way." : "Password reset. You can now log in with the new password.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Request failed."); }
    finally { setPending(false); }
  }

  return <div className={styles.panel}>
    <span className="eyebrow">DAIFY workspace</span><h1>{details.title}</h1><p>{details.intro}</p>
    {message ? <div className={styles.notice} role="status"><strong>Request complete.</strong><span>{message}</span>{mode === "reset-password" ? <Link href="/login">Return to login →</Link> : null}</div> :
      <form method="post" action={`/api/auth/${mode}`} onSubmit={submit}>
        <fieldset className={styles.fields} disabled={!hydrated || pending}>
        {needsName ? <TextField label="Your name" name="displayName" autoComplete="name" required /> : null}
        {mode !== "reset-password" ? <TextField label="Email address" name="email" type="email" autoComplete="email" required /> : null}
        {needsPassword ? <TextField label={mode === "reset-password" ? "New password" : "Password"} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={12} required hint="Use at least twelve characters." /> : null}
        {mode === "login" ? <>
          <TextField label="Authenticator code" name="mfaCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" hint="Required if two-step verification is enabled. Leave blank when using a recovery code." />
          <TextField label="Recovery code" name="recoveryCode" autoComplete="off" spellCheck={false} hint="Use one saved recovery code if you cannot access your authenticator." />
        </> : null}
        {error ? <p role="alert">{error}</p> : null}
        <Button type="submit" disabled={!hydrated || pending}>{pending ? "Please wait…" : details.action} <span aria-hidden="true">↗</span></Button>
        </fieldset>
        {!hydrated ? <p>Enable JavaScript to securely sign in or manage your account.</p> : null}
      </form>}
    <div className={styles.links}>{mode === "login" ? <><Link href="/forgot-password">Forgot password?</Link><Link href="/signup">Create an account</Link></> : <Link href="/login">Back to login</Link>}<Link href="/resend-verification">Resend verification email</Link></div>
  </div>;
}

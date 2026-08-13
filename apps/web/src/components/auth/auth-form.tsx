"use client";

import { Button, TextField } from "@daify/ui";
import Link from "next/link";
import { useState } from "react";
import type { AuthMode } from "@/data/auth";
import styles from "./auth-form.module.css";

const copy: Record<AuthMode, { title: string; intro: string; action: string }> = {
  login: { title: "Welcome back.", intro: "Return to your restaurant workspace.", action: "Log in" },
  signup: { title: "Build your first menu.", intro: "Start with the DAIFY foundation—no card required in this milestone.", action: "Create prototype account" },
  "forgot-password": { title: "Reset your password.", intro: "We’ll eventually send a secure reset link through the M3 authentication service.", action: "Prepare reset request" },
  "reset-password": { title: "Choose a new password.", intro: "This screen demonstrates the production form pattern; credentials are not persisted yet.", action: "Prepare new password" },
};

export function AuthForm({ mode }: { readonly mode: AuthMode }) {
  const [complete, setComplete] = useState(false);
  const details = copy[mode];
  const needsName = mode === "signup";
  const needsPassword = mode === "login" || mode === "signup" || mode === "reset-password";
  return <div className={styles.panel}>
    <span className="eyebrow">DAIFY workspace</span><h1>{details.title}</h1><p>{details.intro}</p>
    {complete ? <div className={styles.notice} role="status"><strong>Foundation interaction confirmed.</strong><span>No account or API call was created. Real authentication belongs to M3.</span><Link href="/dashboard">View the dashboard shell →</Link></div> :
      <form onSubmit={event => { event.preventDefault(); setComplete(true); }}>
        {needsName ? <TextField label="Your name" name="name" autoComplete="name" required /> : null}
        {mode !== "reset-password" ? <TextField label="Email address" name="email" type="email" autoComplete="email" required /> : null}
        {needsPassword ? <TextField label={mode === "reset-password" ? "New password" : "Password"} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required hint="Use at least eight characters for this UI demonstration." /> : null}
        <Button type="submit">{details.action} <span aria-hidden="true">↗</span></Button>
      </form>}
    <div className={styles.links}>{mode === "login" ? <><Link href="/forgot-password">Forgot password?</Link><Link href="/signup">Create an account</Link></> : <Link href="/login">Back to login</Link>}</div>
  </div>;
}

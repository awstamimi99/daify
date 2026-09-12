"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@daify/ui";
import styles from "./auth-form.module.css";

export function AcceptInvitation({ token, email }: { readonly token: string; readonly email: string }) {
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function accept() {
    setPending(true); setError(null);
    try {
      const response = await fetch("/api/organizations/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await response.json() as { detail?: string };
      if (!response.ok) throw new Error(result.detail ?? "This invitation could not be accepted.");
      setAccepted(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Please try again."); }
    finally { setPending(false); }
  }
  return <div className={styles.panel}>
    <span className="eyebrow">Your team</span>
    <h1>{accepted ? "You’re on the team." : "Join your restaurant."}</h1>
    <p>{accepted ? "Your membership is ready. Open your workspace to continue." : `You’re signed in as ${email}. Accept the invitation sent to this address.`}</p>
    {error ? <p role="alert">{error}</p> : null}
    {!token ? <p role="alert">Open the complete link from your invitation email.</p> : accepted ? <ButtonLink href="/dashboard">Open workspace</ButtonLink> : <Button disabled={pending} onClick={() => void accept()}>{pending ? "Joining…" : "Accept invitation"}</Button>}
  </div>;
}
